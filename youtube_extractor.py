import re
import yt_dlp
from typing import Generator, Dict, Any, Optional

def normalize_channel_url(raw_input: str, content_type: str = 'videos') -> str:
    """
    Normalizes any YouTube channel input (full URL, handle, channel ID, custom name)
    into a standardized channel tab URL (e.g. https://www.youtube.com/@Name/videos).
    """
    url = raw_input.strip()
    if not url:
        raise ValueError("Vui lòng nhập link kênh YouTube hoặc Handle (@kênh)")

    # If it doesn't start with http/https
    if not url.startswith('http://') and not url.startswith('https://'):
        if url.startswith('@'):
            url = f"https://www.youtube.com/{url}"
        elif url.startswith('UC') and len(url) == 24:
            url = f"https://www.youtube.com/channel/{url}"
        else:
            url = f"https://www.youtube.com/@{url}"

    # Strip query parameters (?si=...) and fragments (#...)
    url = url.split('?')[0].split('#')[0].rstrip('/')

    # Strip existing subtabs if present
    url = re.sub(r'/(videos|shorts|streams|featured|community|playlists|about|live)$', '', url, flags=re.I)

    # Validate type
    target_tab = 'shorts' if content_type.lower() == 'shorts' else 'videos'
    return f"{url}/{target_tab}"

def format_duration(seconds: Optional[int]) -> str:
    if seconds is None:
        return "--:--"
    try:
        sec = int(seconds)
        hours = sec // 3600
        minutes = (sec % 3600) // 60
        secs = sec % 60
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"
    except Exception:
        return "--:--"

def format_views(count: Optional[int]) -> str:
    if count is None:
        return "N/A"
    try:
        cnt = int(count)
        if cnt >= 1_000_000:
            return f"{cnt / 1_000_000:.1f}M"
        if cnt >= 1_000:
            return f"{cnt / 1_000:.1f}K"
        return f"{cnt:,}"
    except Exception:
        return "N/A"

def extract_channel_stream(
    channel_input: str,
    content_type: str = 'videos',
    shorts_link_type: str = 'shorts',
    max_results: Optional[int] = None
) -> Generator[Dict[str, Any], None, None]:
    """
    Generator that lazily extracts video items from the YouTube channel tab.
    Yields dict for channel_info first, then dict for each video item, and finally a summary dict.
    """
    target_url = normalize_channel_url(channel_input, content_type)
    
    ydl_opts = {
        'extract_flat': 'in_playlist',
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'ignoreerrors': True,
        'lazy_extractors': True,
        'no_color': True,
    }

    if max_results and max_results > 0:
        ydl_opts['playlistend'] = max_results

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(target_url, download=False, process=False)
        
        if not info:
            raise RuntimeError(f"Không thể tải thông tin từ link: {target_url}")

        channel_title = info.get('title') or info.get('uploader') or info.get('channel') or "YouTube Channel"
        channel_id = info.get('channel_id') or info.get('uploader_id') or ""

        # Yield metadata event
        yield {
            'event': 'channel_info',
            'channel_title': channel_title,
            'channel_id': channel_id,
            'target_url': target_url,
            'content_type': content_type
        }

        raw_entries = info.get('entries')
        if raw_entries is None:
            yield {
                'event': 'done',
                'total': 0,
                'message': 'Không tìm thấy video nào trên kênh này'
            }
            return

        count = 0
        for entry in raw_entries:
            if not entry:
                continue
            
            video_id = entry.get('id')
            if not video_id:
                continue

            count += 1
            title = entry.get('title') or f"Video {count}"
            duration_sec = entry.get('duration')
            view_count = entry.get('view_count')
            
            # Construct standard links
            if content_type == 'shorts' and shorts_link_type == 'shorts':
                url = f"https://www.youtube.com/shorts/{video_id}"
            else:
                url = f"https://www.youtube.com/watch?v={video_id}"

            # Get best thumbnail
            thumbnails = entry.get('thumbnails') or []
            thumb_url = ""
            if thumbnails:
                thumb_url = thumbnails[-1].get('url', '')

            item = {
                'index': count,
                'id': video_id,
                'title': title,
                'url': url,
                'watch_url': f"https://www.youtube.com/watch?v={video_id}",
                'shorts_url': f"https://www.youtube.com/shorts/{video_id}",
                'duration_seconds': duration_sec,
                'duration_formatted': format_duration(duration_sec),
                'view_count': view_count,
                'view_count_formatted': format_views(view_count),
                'thumbnail': thumb_url
            }

            yield {
                'event': 'item',
                'item': item,
                'count': count
            }

            if max_results and count >= max_results:
                break

        yield {
            'event': 'done',
            'total': count
        }
