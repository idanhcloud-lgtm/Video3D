"""Time the subtitle phrases of the engine video against the ElevenLabs voice (public/voice/engine.mp3).

No speech model is reachable from the cloud container, so the voice is aligned by counting syllables:
every Vietnamese word is one syllable and each syllable is one peak of the loudness envelope. Peak k is
taken as the start of word k; a phrase starts just before its first word (or at the pause end right before
it) and ends just after its last word (or at the following pause start).
Output: src/data/engineVoice.json  {duration, phrases: [{id, text, start, end, words: [start of each word]}]}
Usage: .venv/bin/python tools/align_voice.py   (needs numpy + scipy)
"""
import json
import re
import subprocess

import numpy as np
from scipy.signal import find_peaks

AUDIO = 'public/voice/engine.mp3'
LEAD, TAIL = 0.12, 0.3  # s before the first / after the last syllable peak

# One entry per subtitle line of the reference video. `id` is used by the scene to time its beats.
PHRASES = [
    ('drop', 'Nếu ném quả pháo đang cháy vào thùng sắt'),
    ('blast', 'Năng lượng vụ nổ sẽ lập tức đẩy nắp lên trời'),
    ('waste', 'Bạn thấy bỏ phí năng lượng này thì quá đáng tiếc'),
    ('flip', 'Nên bạn úp thùng sắt xuống'),
    ('rod', 'Gắn vào nắp một thanh truyền'),
    ('crank', 'Nối thanh truyền với một trục khuỷu'),
    ('updown', 'Như thế nắp chỉ có thể di chuyển lên xuống'),
    ('piston', 'Và thế là bạn đã chế ra pít-tông'),
    ('closed', 'Nhưng thế thì không thả pháo vào thùng kín được nữa'),
    ('hole', 'Nên bạn đục một lỗ nhỏ ở đỉnh thùng'),
    ('drop2', 'Thả quả pháo đang cháy vào trong'),
    ('push', 'Lực nổ tạo ra sẽ đẩy pít-tông đi xuống'),
    ('return', 'Nhưng pít-tông xuống rồi làm sao quay lại vị trí cũ?'),
    ('easy', 'Điều này không làm khó được bạn'),
    ('flywheel', 'Bạn lắp thêm bánh đà vào trục khuỷu'),
    ('inertia', 'Nhờ quán tính của bánh đà'),
    ('back', 'Kéo trục khuỷu đẩy pít-tông về chỗ cũ'),
    ('bother', 'Nhưng lần nào cũng đốt pháo thì phiền quá'),
    ('injector', 'Nên bạn gắn vòi phun lên đỉnh thùng'),
    ('fuel', 'Dùng nhiên liệu thay pháo'),
    ('plug', 'Lắp thêm một chiếc bu-gi'),
    ('ignite', 'Để đốt cháy nhiên liệu'),
    ('nooxy', 'Nhưng không gian kín lại thiếu ô-xy'),
    ('nofire', 'Nên không thể đánh lửa'),
    ('intake', 'Vì vậy bạn gắn thêm van nạp cạnh vòi phun'),
    ('mix', 'Nhờ đó ô-xy và nhiên liệu cùng vào thùng'),
    ('burn', 'Bu-gi đốt cháy chúng tạo nổ và phát lực'),
    ('problem', 'Nhưng lại có vấn đề'),
    ('trapped', 'Khí thải từ vụ nổ không thể thoát ra ngoài'),
    ('block', 'Làm cản trở hỗn hợp khí mới vào'),
    ('stall', 'Khiến động lực giảm đi và ngừng hoạt động'),
    ('exhaust', 'Nên bạn gắn thêm van xả ở phía bên kia đỉnh thùng'),
    ('out', 'Giúp khí thải thoát ra dễ dàng'),
    ('manual', 'Nhưng tự mở đóng hai van bằng tay'),
    ('tired', 'Vừa mệt lại không kịp tốc độ'),
    ('cams', 'Bạn lại thông minh lấy ngay hai trục cam'),
    ('mount', 'Lắp lần lượt lên trên đỉnh mỗi van'),
    ('rotate', 'Khi trục cam quay tròn'),
    ('lobe', 'Phần gờ trên trục sẽ đẩy mở van'),
    ('stuck', 'Nhưng van mở xong lại không tự đóng'),
    ('springs', 'Thế là bạn gắn thêm lò xo cho cả hai van'),
    ('pushed', 'Như vậy khi van bị đẩy mở'),
    ('pull', 'Lực lò xo sẽ kéo van trở về vị trí cũ'),
    ('seal', 'Đóng thật chặt lại'),
    ('sync', 'Trục cam vận hành đồng bộ, điều khiển chuẩn xác nhịp đóng mở van'),
    ('s1', 'Khi van nạp mở ra, pít-tông đi xuống'),
    ('s1b', 'Hỗn hợp nhiên liệu và khí bị hút vào thùng'),
    ('cyl', 'Chính là xi-lanh'),
    ('s2', 'Van nạp đóng lại, pít-tông đi lên'),
    ('s2b', 'Nén chặt hỗn hợp khí lại'),
    ('s3', 'Bu-gi bật tia lửa'),
    ('s3b', 'Hỗn hợp nổ tung, đẩy pít-tông xuống'),
    ('s4', 'Lúc này van xả mở ra'),
    ('s4b', 'Pít-tông lại đi lên, đẩy sạch khí thải ra khỏi xi-lanh'),
    ('cycle', 'Nạp, nén, nổ, xả'),
    ('done', 'Hoàn thành một chu kỳ'),
    ('next', 'Vòng tiếp theo bắt đầu ngay'),
    ('all', 'Các bộ phận cùng vận hành'),
    ('congrats', 'Xin chúc mừng bạn'),
    ('built', 'Bạn đã chế tạo thành công động cơ đốt trong bốn thì'),
    ('runs', 'Bộ máy này liên tục vận hành'),
    ('heart', 'Trở thành trái tim động lực cho ô tô và nhiều máy móc ngày nay'),
]


def probe_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def pauses(path):
    log = subprocess.run(['ffmpeg', '-v', 'info', '-i', path, '-af', 'silencedetect=n=-38dB:d=0.08', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', log)]
    return list(zip(starts, ends))


def syllable_peaks(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
    c = np.concatenate([[0], np.cumsum(x * x)])
    win, hop = 400, 160  # 25 ms window, 10 ms hop
    idx = np.arange(0, len(x) - win, hop)
    rms = np.sqrt((c[idx + win] - c[idx]) / win)
    h = np.hanning(9)
    env = np.convolve(rms, h / h.sum(), 'same')
    db = 20 * np.log10(env + 1e-6)
    peaks, _ = find_peaks(db, prominence=3, distance=9, height=-35)
    return (peaks * hop + win / 2) / 16000


def main():
    dur = probe_duration(AUDIO)
    gaps = pauses(AUDIO)
    peaks = syllable_peaks(AUDIO)
    words = [len(text.split()) for _, text in PHRASES]
    scale = len(peaks) / sum(words)
    print(f'{len(peaks)} syllable peaks for {sum(words)} words')
    starts, ends, word_times, k = [], [], [], 0
    for w in words:
        first = peaks[min(len(peaks) - 1, round(k * scale))]
        last = peaks[min(len(peaks) - 1, round((k + w) * scale) - 1)]
        pe = [b for a, b in gaps if first - 0.6 <= b <= first]
        ps = [a for a, b in gaps if last <= a <= last + 0.6]
        starts.append(pe[-1] if pe else first - LEAD)
        ends.append(ps[0] if ps else last + TAIL)
        word_times.append([round(float(peaks[min(len(peaks) - 1, round((k + j) * scale))]) - 0.05, 3) for j in range(w)])
        k += w
    starts[0] = 0.0
    for i in range(len(starts) - 1):
        ends[i] = min(ends[i], starts[i + 1])
    ends[-1] = dur

    out = []
    for i, (pid, text) in enumerate(PHRASES):
        out.append({'id': pid, 'text': text, 'start': round(float(starts[i]), 3), 'end': round(float(ends[i]), 3),
                    'words': word_times[i]})
    json.dump({'duration': round(dur, 3), 'phrases': out}, open('src/data/engineVoice.json', 'w'),
              ensure_ascii=False, indent=None, separators=(',', ':'))
    for p in out:
        print(f"{p['start']:7.2f} {p['end']:7.2f}  {p['text']}")


main()
