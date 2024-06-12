from flask import Flask, session, render_template, request, redirect, url_for, Response, jsonify, flash
import pyrebase
import cv2
from dotenv import load_dotenv
import os
import base64
from io import BytesIO
from PIL import Image
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from moviepy.editor import VideoFileClip
from flask_mail import Mail
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import base64
import shutil
from flask_cors import CORS
import time
import threading
import sys
import signal
import tempfile
# Load environment variables from .env
load_dotenv() 

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv('SECRET_KEY')

config ={
    "apiKey": os.getenv('API_KEY'),
    "authDomain": os.getenv('AUTH_DOMAIN'),
    "databaseURL": os.getenv('DATABASE_URL'),
    "projectId": os.getenv('PROJECT_ID'),
    "storageBucket": os.getenv('STORAGE_BUCKET'),
    "messagingSenderId": os.getenv('MESSAGING_SENDER_ID'),
    "appId": os.getenv('APP_ID')
}

mail = Mail(app)

firebase = pyrebase.initialize_app(config)
auth = firebase.auth()
db = firebase.database()
storage = firebase.storage()

########################################################
camera = cv2.VideoCapture(0)
recording = False
no_person_detected_timer = 0
out = None
stop_flag = threading.Event()
########################################################

def send_email(video_path, toaddr):
    fromaddr = "proiecte.facultate10@gmail.com"
    msg = MIMEMultipart()

    msg['From'] = fromaddr
    msg['To'] = toaddr
    msg['Subject'] = "SnapStream - Person detected"

    body = "A person has been detected. Video footage is attached."
    msg.attach(MIMEText(body, 'plain'))

    attachment = open(video_path, "rb")
    part = MIMEBase('application', 'octet-stream')
    part.set_payload((attachment).read())
    encoders.encode_base64(part)
    part.add_header('Content-Disposition', "attachment; filename= %s" % 'video.mp4')
    msg.attach(part)

    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(fromaddr, "lnzsceoxurqexcvq")
    text = msg.as_string()
    server.sendmail(fromaddr, toaddr, text)
    server.quit()

    return 'Message sent!'


def capture_video():
    global camera, out, recording, no_person_detected_timer

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    fullbody_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_fullbody.xml')
    
    while not stop_flag.is_set():
        success, frame = camera.read()
        if not success:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        fullbodies = fullbody_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) > 0 or len(fullbodies) > 0:
            if not recording:
                print('START RECORDING')
                out = cv2.VideoWriter('output.avi', cv2.VideoWriter_fourcc(*'XVID'), 20.0, (640, 480))
                recording = True
                no_person_detected_timer = 0
                with app.app_context():
                    capture_and_upload_image(frame)
        else:
            no_person_detected_timer += 1
            if recording and no_person_detected_timer >= 3 * 20:  # 3 sec - rata 20 cadre/sec
                print('STOP RECORDING')
                out.release()
                recording = False
                temp_video_path = save_temp_video('output.avi')
                if temp_video_path:
                    mp4_video_path = convert_and_resize_video(temp_video_path)
                    if mp4_video_path:
                        with app.app_context():
                            upload_auto_video(mp4_video_path)
                    else:
                        print("Failed to convert video to MP4.")
                else:
                    print("Failed to save temp video.")

        for (x, y, w, h) in faces:
                cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
        for (x, y, w, h) in fullbodies:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

        if recording:
            out.write(frame)

        time.sleep(0.05)  # Sleep for 50ms to avoid high CPU usage

# def generate_frames():
#     global camera
#     while True:
#         success, frame = camera.read()
#         if not success:
#             continue

#         ret, buffer = cv2.imencode('.jpg', frame)
#         frame = buffer.tobytes()
#         yield (b'--frame\r\n'
#                b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


def generate_frames():
    global camera, face_cascade, fullbody_cascade
    while True:
        success, frame = camera.read()
        if not success:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        fullbodies = fullbody_cascade.detectMultiScale(gray, 1.1, 4)

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
        for (x, y, w, h) in fullbodies:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

def save_temp_video(video_file_path):
    try:
        temp_dir = tempfile.mkdtemp()
        video_file_name = os.path.basename(video_file_path)
        temp_video_path = os.path.join(temp_dir, video_file_name)

        shutil.copyfile(video_file_path, temp_video_path)

        return temp_video_path
    except Exception as e:
        print("An error occurred while saving temp video:", e)
        return None


def convert_and_resize_video(input_path):
    output_path = input_path.replace('.avi', '.mp4')
    try:
        clip = VideoFileClip(input_path)
        clip_resized = clip.resize(width=640)  
        clip_resized.write_videofile(output_path, codec='libx264', audio_codec='aac')
        return output_path
    except Exception as e:
        print(f"Error converting video: {e}")
        return None


@app.route('/upload_auto_video', methods=['POST'])
def upload_auto_video(video_path):
    print('UPLOAD...')
    try:
        user_id = 'bcepyT7eLBRdqXgU7xKg1nVZZFz2'
        storage_path = f"AutoLiveRecordings/{user_id}"
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = secure_filename(f"{user_id}_{unique_id}_{timestamp}.mp4")

        try:
            storage.child(storage_path).child(filename).put(video_path, content_type='video/mp4')
            print("Fisierul a fost incarcat cu succes in Firebase Storage.")
        except Exception as e:
            print("Error Firebase Storage:", e)
            return jsonify({"error": "Failed to upload file to Firebase Storage"}), 500

        try:
            date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
            file_size_in_mb = os.path.getsize(video_path) / (1024 * 1024)
            db.child("UserCaptures").child("AutoLiveRecordings").child(user_id).push({
                "details": {
                    "timestamp": date_time,
                    "size":  f"{file_size_in_mb:.2f} MB",
                    "filename": filename,
                    "storage_path": f"{storage_path}/{filename}"
                }
            })
            print('The recording has been successfully saved in the database!')
        except Exception as e:
            print("Error Firebase Database:", e)
            return jsonify({"error": "Failed to save to Firebase Database"}), 500

        try:
            send_email(video_path, 'poli.mastersiaps@gmail.com')
        except Exception as e:
            print("Error sending email:", e)
            return jsonify({"error": "Email sending failed..."}), 500
        
        try:
            os.remove(video_path)
        except Exception as e:
            print("Error deleting temporary video file:", e)

        return jsonify({"message": "The recording has been successfully saved!"})
    except Exception as e:
        print('Failed to upload video:', str(e))
        return jsonify({"error": "Failed to process the upload"}), 500


def capture_and_upload_image(frame):
    try:
        time.sleep(3)
        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        user_id = 'bcepyT7eLBRdqXgU7xKg1nVZZFz2' 
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
        date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
        unique_filename = f"{user_id}_{timestamp}.png"
        temp_path = f"temp_{unique_filename}"
        
        image.save(temp_path)

        storage_path = f"AutoLiveCaptures/{user_id}/{unique_filename}"
        storage.child(storage_path).put(temp_path)
        file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)

        db.child("UserCaptures").child("AutoLiveCaptures").child(user_id).child(unique_id).set({
            "details": {
                "timestamp": date_time,
                "size":  f"{file_size_in_mb:.2f} MB",
                "filename": unique_filename,
                "storage_path": storage_path
            }
        })

        os.remove(temp_path)

        print("Image captured and uploaded successfully!")

    except Exception as e:
        print("An error occurred while capturing and uploading the image:", e)

#######################################################################
############################ STORAGE PAGE ############################# 
#######################################################################
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'user' not in session:
        return jsonify({"error": "User not authenticated"}), 403  

    user_id = session['user_id']
    data = request.get_json()
    image_data = data['image']
    image_data = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data))

    unique_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
    date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
    unique_filename = f"{user_id}_{timestamp}.png"
    temp_path = f"temp_{unique_filename}"
    image.save(temp_path)

    storage_path = f"LiveCaptures/{user_id}/{unique_filename}"
    storage.child(storage_path).put(temp_path)
    file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)

    db.child("UserCaptures").child("LiveCaptures").child(user_id).child(unique_id).set({
        "details": {
            "timestamp": date_time,
            "size":  f"{file_size_in_mb:.2f} MB",
            "filename": unique_filename,
            "storage_path": storage_path
        }
    })

    os.remove(temp_path)
    return jsonify({"message": "The image has been successfully saved!"})

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def signal_handler(sig, frame):
    print('Exiting gracefully')
    stop_flag.set()
    camera.release()
    if recording and out is not None:
        out.release()
    sys.exit(0)


face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
fullbody_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_fullbody.xml')


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)  # Handle Ctrl+C
    video_thread = threading.Thread(target=capture_video)
    video_thread.start()
    try:
        app.run(debug=True, use_reloader=False)
    except KeyboardInterrupt:
        pass
    finally:
        stop_flag.set()
        video_thread.join()
        camera.release()
        if recording and out is not None:
            out.release()
        print("Application stopped.")
