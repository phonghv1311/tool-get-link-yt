import json
import logging
from flask import Flask, render_template, request, Response, jsonify
from youtube_extractor import extract_channel_stream, normalize_channel_url

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stream')
def stream_links():
    channel = request.args.get('channel', '').strip()
    content_type = request.args.get('type', 'videos').strip().lower()
    shorts_format = request.args.get('shorts_format', 'shorts').strip().lower()
    max_results_str = request.args.get('max', '0').strip()
    
    try:
        max_results = int(max_results_str) if max_results_str.isdigit() and int(max_results_str) > 0 else None
    except ValueError:
        max_results = None

    if not channel:
        def error_gen():
            err_data = json.dumps({'event': 'error', 'message': 'Vui lòng cung cấp link hoặc tên kênh YouTube.'}, ensure_ascii=False)
            yield f"data: {err_data}\n\n"
        return Response(error_gen(), mimetype='text/event-stream')

    def event_stream():
        try:
            logger.info(f"Bắt đầu crawl: channel={channel}, type={content_type}, max={max_results}")
            for item in extract_channel_stream(
                channel_input=channel,
                content_type=content_type,
                shorts_link_type=shorts_format,
                max_results=max_results
            ):
                payload = json.dumps(item, ensure_ascii=False)
                yield f"data: {payload}\n\n"
        except Exception as e:
            logger.error(f"Lỗi extract: {str(e)}", exc_info=True)
            err_data = json.dumps({'event': 'error', 'message': f"Lỗi: {str(e)}"}, ensure_ascii=False)
            yield f"data: {err_data}\n\n"

    response = Response(event_stream(), mimetype='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache, no-transform'
    response.headers['X-Accel-Buffering'] = 'no'
    response.headers['Connection'] = 'keep-alive'
    return response

@app.route('/api/extract', methods=['POST'])
def extract_batch():
    data = request.get_json(silent=True) or {}
    channel = data.get('channel', '').strip()
    content_type = data.get('type', 'videos').strip().lower()
    shorts_format = data.get('shorts_format', 'shorts').strip().lower()
    max_results = data.get('max')
    
    try:
        max_results = int(max_results) if max_results and int(max_results) > 0 else None
    except (ValueError, TypeError):
        max_results = None

    if not channel:
        return jsonify({'success': False, 'message': 'Vui lòng cung cấp link kênh YouTube.'}), 400

    try:
        items = []
        channel_title = ""
        channel_id = ""
        target_url = ""
        
        for event in extract_channel_stream(
            channel_input=channel,
            content_type=content_type,
            shorts_link_type=shorts_format,
            max_results=max_results
        ):
            ev_type = event.get('event')
            if ev_type == 'channel_info':
                channel_title = event.get('channel_title', '')
                channel_id = event.get('channel_id', '')
                target_url = event.get('target_url', '')
            elif ev_type == 'item':
                items.append(event.get('item'))

        return jsonify({
            'success': True,
            'channel_title': channel_title,
            'channel_id': channel_id,
            'target_url': target_url,
            'total': len(items),
            'items': items
        })
    except Exception as e:
        logger.error(f"Batch extract error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    port = 3030
    print(f"============================================================")
    print(f"🚀 YouTube Channel Video Link Extractor chạy tại:")
    print(f"👉 http://localhost:{port}")
    print(f"============================================================")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
