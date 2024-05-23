from flask import Flask, session, render_template, request, redirect, url_for, Response, jsonify, flash, send_file
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
from flask_mail import Mail, Message
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import requests
import base64
import shutil
from flask_cors import CORS
import time

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
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['MAIL_SERVER']='live.smtp.mailtrap.io'
app.config['MAIL_PORT']=587
app.config['MAIL_USERNAME']='api'
app.config['MAIL_PASSWORD']='b35f8d67f9dbcb2e687e6ae1e37cd20e'
app.config['MAIL_USE_TLS']=True
app.config['MAIL_USE_SSL']=False

app.config['UPLOAD_FOLDER'] = 'project/static/tempFile'

mail = Mail(app)

firebase = pyrebase.initialize_app(config)
auth = firebase.auth()
db = firebase.database()
storage = firebase.storage()



import tempfile

video_buffer = None  # Inițializăm buffer-ul video

@app.route('/recording_status', methods=['GET'])
def get_recording_status():
    global video_buffer
    if video_buffer:
        return jsonify({"recording": True})
    else:
        return jsonify({"recording": False})
#######################################################################
############################ REGISTER PAGE ############################ 
#######################################################################
@app.route('/register', methods=['POST'])
def register():
    regUsername = request.form['regUsername'].strip()
    regEmail = request.form['regEmail'].strip()
    regPassword = request.form['regPassword'].strip()
    regPhone = request.form['regPhone'].strip()

    try:
        user = auth.create_user_with_email_and_password(regEmail, regPassword)
        uid = user['localId']
        data = {"username": regUsername, "email": regEmail, "phone": regPhone}
        db.child("Users").child(uid).set(data)

        flash('Account created successfully! Please log in.', 'success')
        return jsonify({'success': True, 'redirect': url_for('index')})
    except Exception as e:
        flash('An account with this email address already exists. Please use a different email.', 'danger')
        print(e)

        return jsonify({'success': False, 'message': 'An account with this email address already exists. Please use a different email.'})

#######################################################################
############################# LOGIN PAGE ############################## 
#######################################################################
@app.route('/', methods=['POST', 'GET'])
def index():
    if 'user' in session:
        return redirect(url_for('home')) 

    login_message = None
    alert_class = None

    if request.method == "POST":
        email = request.form.get('email')
        password = request.form.get('password')
        try:
            user = auth.sign_in_with_email_and_password(email, password)
            session['user_id'] = user['localId'] 
            all_users = db.child("Users").get()
            for user in all_users.each():
                if user.val().get("email") == email:
                    session['user'] = email
                    session['name'] = user.val().get("name")
                    session['username'] = user.val().get("username")  
                    return redirect(url_for('home'))  
            login_message = 'Incorrect email or password. Please try again.'
            alert_class = 'danger'
        except:
            login_message = 'Incorrect email or password. Please try again.'
            alert_class = 'danger'

    return render_template('login.html', login_message=login_message, login_alert_class=alert_class)


#######################################################################
############################# HOME PAGE ############################### 
#######################################################################
@app.route('/home')
def home():
    if 'user' in session:
        username = session.get('username', '')
        return render_template('home.html', username=username)
    else:
        return redirect(url_for('index'))

#######################################################################
##################### RESET PASSWORD PAGE ############################# 
#######################################################################
@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        email = request.form.get('email')
        all_users = db.child("Users").get()
        user_exists = False
        for user in all_users.each():
            if user.val().get("email") == email:
                user_exists = True
                break 

        if user_exists:
            try:
                auth.send_password_reset_email(email)
                session['message'] = 'Check your email for the password reset link.'
                session['alert_class'] = 'success'
            except:
                session['message'] = 'Error sending the password reset email.'
                session['alert_class'] = 'danger'
        else:
            session['message'] = 'There is no account with this email address.'
            session['alert_class'] = 'danger'

        return redirect(url_for('reset_password')) 

    message = session.pop('message', None)
    alert_class = session.pop('alert_class', 'info')
    return render_template('reset_password.html', message=message, alert_class=alert_class)

#######################################################################
########################### STREAMING PAGE ############################ 
#######################################################################

@app.route('/streaming')
def streaming():
    if 'user' in session:
        username = session.get('username', '')
        return render_template('streaming.html', username=username)
    else:
        return redirect(url_for('index'))

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

def save_temp_video(video_file_path):
    try:
        # Creează un director temporar
        temp_dir = tempfile.mkdtemp()

        # Obține numele fișierului din calea către fișierul video
        video_file_name = os.path.basename(video_file_path)

        # Construiește calea către fișierul temporar
        temp_video_path = os.path.join(temp_dir, video_file_name)

        # Copiază fișierul video în directorul temporar
        shutil.copyfile(video_file_path, temp_video_path)

        return temp_video_path
    except Exception as e:
        print("An error occurred while saving temp video:", e)
        return None

def generate_frames():
    global video_buffer
    try:
        camera = cv2.VideoCapture(0)
        out = None
        recording = False
        no_motion_timer = 0

        while True:
            success, frame = camera.read()

            if not success:
                break

            else:
                detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = detector.detectMultiScale(gray, 1.1, 7)

                if len(faces) > 0:
                    if not recording:
                        print('START RECORDING')
                        out = cv2.VideoWriter('output.avi', cv2.VideoWriter_fourcc(*'XVID'), 20.0, (640, 480))

                        recording = True
                        no_motion_timer = 0

                        with app.app_context():
                            capture_and_upload_image(frame)
                      
                else:
                    no_motion_timer += 1
                    if recording:
                        if no_motion_timer >= 3 * 20: # 3 sec - rata 20 cadre/sec
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

                if recording:
                    out.write(frame)

                for (x, y, w, h) in faces:
                    cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

                ret, buffer = cv2.imencode('.jpg', frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    except Exception as e:
        print("An error occurred:", e)      


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
            return jsonify({"error": "Failed to upload to Firebase Storage"}), 500

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
            os.remove(video_path)
        except Exception as e:
            print("Error deleting temporary video file:", e)

        return jsonify({"message": "The recording has been successfully saved!"})
    except Exception as e:
        print('Failed to upload video:', str(e))
        return jsonify({"error": "Failed to process the upload"}), 500


@app.route('/upload_manual_video', methods=['POST'])
def upload_manual_video():
    try:
        video_file = request.files['video']
        if not video_file:
            return jsonify({"error": "No video part"}), 400

        user_id = 'bcepyT7eLBRdqXgU7xKg1nVZZFz2'
        storage_path = f"LiveRecordings/{user_id}"
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = secure_filename(f"{user_id}_{unique_id}_{timestamp}.mp4")

        temp_path = f"temp_{filename}"
        video_file.save(temp_path)

        try:
            storage.child(storage_path).child(filename).put(temp_path, content_type='video/mp4')
            print("Fisierul a fost incarcat cu succes in Firebase Storage.")
        except Exception as e:
            print("Error Firebase Storage:", e)
            return jsonify({"error": "Failed to upload to Firebase Storage"}), 500

        try:
            date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
            file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)
            db.child("UserCaptures").child("LiveRecordings").child(user_id).push({
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
            os.remove(temp_path)
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


def send_email(video_path, toaddr):
    fromaddr = "proiecte.facultate10@gmail.com"
    msg = MIMEMultipart()

    msg['From'] = fromaddr
    msg['To'] = toaddr
    msg['Subject'] = "TEST MSG - Person detected"

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


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload_video', methods=['POST'])
def upload_video():
    if 'user' not in session:
        return jsonify({"error": "User not authenticated"}), 403

    user_id = session['user_id']

    if 'video' not in request.files:
        return jsonify({"error": "No video part"}), 400

    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({"error": "No selected video"}), 400

    if not allowed_file(video_file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
    unique_id = str(uuid.uuid4())
    filename = secure_filename(f"{user_id}_{unique_id}_{timestamp}.webm")

    temp_path = f"temp_{filename}.mp4"
    video_file.save(temp_path)
  
    # send email with video
    email = session['user']
    send_email(temp_path, email)

    storage_path = f"LiveRecordings/{user_id}/{filename}"
    storage.child(storage_path).put(temp_path)
    file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)

    db.child("UserCaptures").child("LiveRecordings").child(user_id).child(unique_id).set({
        "details": {
            "timestamp": date_time,
            "size":  f"{file_size_in_mb:.2f} MB",
            "filename": filename,
            "storage_path": storage_path
        }
    })

    os.remove(temp_path)

    return jsonify({"message": "The recording has been successfully saved!"})

# storage
@app.route('/storage')
def storage_page():
    if 'user' in session:
        username = session.get('username', '')
        return render_template('storage.html', username=username)
    else:
        return redirect(url_for('index'))

@app.route('/get_images')
def get_images():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    images_details = db.child("UserCaptures").child("LiveCaptures").child(user_id).get()

    images = [] 
    if images_details.val():
        for image in images_details.each():
            image_data = image.val()['details']
            storage_path = image_data['storage_path']
            size = image_data.get('size', 'N/A')  
            timestamp = image_data.get('timestamp', 'N/A') 
            try:
                image_date = datetime.strptime(timestamp, "%d %b %Y %H:%M:%S").strftime("%Y-%m-%d")
            except ValueError:
                continue 

            url = storage.child(storage_path).get_url(None)
            unique_id = image.key()

            if selected_date:
                if image_date == selected_date:
                    images.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path
                    })
            else:
                images.append({
                    'url': url,
                    'size': size,
                    'timestamp': timestamp,
                    'unique_id': unique_id,
                    'storage_path': storage_path
                })

    return jsonify(images)


@app.route('/get_autoimages')
def get_autoimages():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    images_details = db.child("UserCaptures").child("AutoLiveCaptures").child(user_id).get()

    images = [] 
    if images_details.val():
        for image in images_details.each():
            image_data = image.val()['details']
            storage_path = image_data['storage_path']
            size = image_data.get('size', 'N/A')  
            timestamp = image_data.get('timestamp', 'N/A') 
            try:
                image_date = datetime.strptime(timestamp, "%d %b %Y %H:%M:%S").strftime("%Y-%m-%d")
            except ValueError:
                continue 

            url = storage.child(storage_path).get_url(None)
            unique_id = image.key()

            if selected_date:
                if image_date == selected_date:
                    images.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path
                    })
            else:
                images.append({
                    'url': url,
                    'size': size,
                    'timestamp': timestamp,
                    'unique_id': unique_id,
                    'storage_path': storage_path
                })

    return jsonify(images)

@app.route('/get_videos')
def get_videos():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    video_details = db.child("UserCaptures").child("LiveRecordings").child(user_id).get()

    videos = [] 
    if video_details.val():
        for video in video_details.each():
            video_data = video.val()['details']
            storage_path = video_data['storage_path']
            size = video_data.get('size', 'N/A')  
            timestamp = video_data.get('timestamp', 'N/A')  
            try:
                video_date = datetime.strptime(timestamp, "%d %b %Y %H:%M:%S").strftime("%Y-%m-%d")
            except ValueError:
                continue 

            url = storage.child(storage_path).get_url(None)
            unique_id = video.key()

            if selected_date:
                if video_date == selected_date:
                    videos.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path
                    })
            else:
                videos.append({
                    'url': url,
                    'size': size,
                    'timestamp': timestamp,
                    'unique_id': unique_id,
                    'storage_path': storage_path
                })

    return jsonify(videos)



@app.route('/get_autovideos')
def get_autovideos():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    video_details = db.child("UserCaptures").child("AutoLiveRecordings").child(user_id).get()

    videos = [] 
    if video_details.val():
        for video in video_details.each():
            video_data = video.val()['details']
            storage_path = video_data['storage_path']
            size = video_data.get('size', 'N/A')  
            timestamp = video_data.get('timestamp', 'N/A')  
            try:
                video_date = datetime.strptime(timestamp, "%d %b %Y %H:%M:%S").strftime("%Y-%m-%d")
            except ValueError:
                continue 

            url = storage.child(storage_path).get_url(None)
            unique_id = video.key()

            if selected_date:
                if video_date == selected_date:
                    videos.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path
                    })
            else:
                videos.append({
                    'url': url,
                    'size': size,
                    'timestamp': timestamp,
                    'unique_id': unique_id,
                    'storage_path': storage_path
                })

    return jsonify(videos)



# delete image
@app.route('/delete_image', methods=['POST'])
def delete_image():
    if 'user' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unique_id = data.get('unique_id')
    #storage_path = data.get('storage_path')

    try:
        #storage.child(storage_path).delete(storage_path)
        db.child("UserCaptures").child("LiveCaptures").child(user_id).child(unique_id).remove()

        return jsonify({'status': 'success', 'message': 'Image deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete image: {}'.format(str(e))}), 500
    
    
@app.route('/delete_autoimage', methods=['POST'])
def delete_autoimage():
    if 'user' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unique_id = data.get('unique_id')
    #storage_path = data.get('storage_path')

    try:
        #storage.child(storage_path).delete(storage_path)
        db.child("UserCaptures").child("AutoLiveCaptures").child(user_id).child(unique_id).remove()

        return jsonify({'status': 'success', 'message': 'Image deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete image: {}'.format(str(e))}), 500


# delete video
@app.route('/delete_video', methods=['POST'])
def delete_video():
    if 'user' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unique_id = data.get('unique_id')
    #storage_path = data.get('storage_path')

    try:
        #storage.child(storage_path).delete(storage_path)
        db.child("UserCaptures").child("LiveRecordings").child(user_id).child(unique_id).remove()

        return jsonify({'status': 'success', 'message': 'Video deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete video: {}'.format(str(e))}), 500
    

# delete auto live recordings
@app.route('/delete_autovideo', methods=['POST'])
def delete_autovideo():
    if 'user' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unique_id = data.get('unique_id')
    #storage_path = data.get('storage_path')

    try:
        #storage.child(storage_path).delete(storage_path)
        db.child("UserCaptures").child("AutoLiveRecordings").child(user_id).child(unique_id).remove()

        return jsonify({'status': 'success', 'message': 'Video deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete video: {}'.format(str(e))}), 500

#######################################################################
############################ PROFILE PAGE ############################# 
#######################################################################
@app.route('/profile')
def profile():
    if 'user' not in session:
        return redirect(url_for('index'))

    user_email = session['user']
    user_data = None

    all_users = db.child("Users").get()
    for user in all_users.each():
        if user.val().get("email") == user_email:
            user_data = user.val()
            break

    if user_data is None:
        flash('User data not found.', 'danger')
        return redirect(url_for('index'))

    return render_template('profile.html', username=user_data['username'], user=user_data)


@app.route('/update_profile', methods=['POST'])
def update_profile():
    
    user_id = session['user_id']
    data = request.form

    try:
        if 'field' in data and 'value' in data:
            field = data['field']
            value = data['value']

            db.child("Users").child(user_id).update({
                field: value
            })

            if field == 'username':    
                update_username_in_session(value)

            success_message = "Profile updated successfully!"

            return jsonify({'success': True, 'message': success_message})

        else:
            raise ValueError("Field or value missing in request.")

    except Exception as e:
        error_message = str(e)
        return jsonify({'success': False, 'message': error_message})


@app.route('/upload_profile_picture', methods=['POST'])
def upload_profile_picture():
    if 'user_id' not in session:
        return jsonify({"error": "User not authenticated"}), 403

    user_id = session['user_id']
    data = request.get_json()
    image_data = data['image']
    image_data = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data))

    timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
    unique_filename = f"{user_id}_{timestamp}.png"
    temp_path = f"temp_{unique_filename}"
    image.save(temp_path)

    storage_path = f"ProfilePictures/{user_id}/{unique_filename}"
    storage.child(storage_path).put(temp_path)

    db.child("UserProfilePictures").child(user_id).set({
        "storage_path": storage_path
    })

    os.remove(temp_path)
    return jsonify({"message": "Imaginea a fost încărcată cu succes!"})


@app.route('/profile_picture')
def get_profile_picture():
    if 'user_id' not in session:
        return jsonify({"error": "User not authenticated"}), 403

    user_id = session['user_id']
    user_data = db.child("UserProfilePictures").child(user_id).get().val()

    if user_data:
        storage_path = user_data.get('storage_path', '')
        print("Path: " + storage_path)
       
        try:
            image_url = storage.child(storage_path).get_url(None)
            return redirect(image_url)
        except Exception as e:
            print("Error getting image from Firebase Storage:", e)
    
    # default profile picture
    return redirect('/static/img/avatar.jpg')


@app.route('/change_password', methods=['POST'])
def change_password():
    email = request.form.get('email')

    try:
        auth.send_password_reset_email(email)
        message = 'Check your email for the password reset link.'
        alert_class = 'success'
    except:
        message = 'Error sending the password reset email.'
        alert_class = 'danger'

    return jsonify({'message': message, 'alert_class': alert_class})

# After updated the name in DB
def update_username_in_session(new_username):
    if 'user' in session:
        session['username'] = new_username


@app.context_processor
def inject_username():
    if 'user' in session:
        username = session.get('username', '')
        return dict(username=username)
    else:
        return dict(username=None)


# logout function
@app.route('/logout')
def logout():
    session.pop('user')
    return redirect('/')
 
 
if __name__ == "__main__":
    with app.app_context():
        app.run(debug=True)
