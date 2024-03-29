from flask import Flask, session, render_template, request, redirect, url_for, Response, jsonify
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

# Load environment variables from .env
load_dotenv() 

app = Flask(__name__)
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

firebase = pyrebase.initialize_app(config)
auth = firebase.auth()
db = firebase.database()
storage = firebase.storage()

# register page
@app.route('/register', methods=['POST'])
def register():
    regUsername = request.form['regUsername']
    regEmail = request.form['regEmail']
    regPassword = request.form['regPassword']
    regAddress = request.form['regAddress']

    try:
        user = auth.create_user_with_email_and_password(regEmail, regPassword)
        uid = user['localId']
        data = {"username": regUsername, "email": regEmail, "address": regAddress}
        db.child("Users").child(uid).set(data)
        return redirect(url_for('index'))  
    except:
        return 'Failed to register'


# login page
@app.route('/', methods=['POST', 'GET'])
def index():
    if 'user' in session:
        return redirect(url_for('home')) 
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
                    session['username'] = user.val().get("username")  
                    break
            return redirect(url_for('home'))
        except:
            return 'Failed to login'
    return render_template('login.html')


# home page
@app.route('/home')
def home():
    if 'user' in session:
        username = session.get('username', 'Oaspete')
        return render_template('home.html', username=username)
    else:
        return redirect(url_for('index'))

# reset password page
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

# streaming page
@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

def gen_frames():
    camera = cv2.VideoCapture(0)  # Use 0 for web camera
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/streaming')
def streaming():
    return render_template('streaming.html')

@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'user' not in session:
        return jsonify({"error": "User not authenticated"}), 403  

    user_id = session['user_id']
    data = request.get_json()
    image_data = data['image']
    image_data = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data))

    # Generate a unique identifier for this capture
    unique_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
    date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
    unique_filename = f"{user_id}_{timestamp}.png"
    temp_path = f"temp_{unique_filename}"
    image.save(temp_path)

    # Specify the folder in Firebase Storage and upload the file
    storage_path = f"LiveCaptures/{user_id}/{unique_filename}"
    storage.child(storage_path).put(temp_path)
    file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)

    # Store metadata in Realtime Database under the structured path
    db.child("UserCaptures").child("LiveCaptures").child(user_id).child(unique_id).set({
        "details": {
            "timestamp": date_time,
            "size":  f"{file_size_in_mb:.2f} MB",
            "filename": unique_filename,
            "storage_path": storage_path
        }
    })
    # Clean up the temporary file
    os.remove(temp_path)
    return jsonify({"message": "Image uploaded successfully to Firebase Storage and details stored in Realtime Database."})


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

    # Asigură-te că fișierul este un videoclip (validare simplă pe baza extensiei)
    if not allowed_file(video_file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
    unique_id = str(uuid.uuid4())
    filename = secure_filename(f"{user_id}_{unique_id}_{timestamp}.webm")

    # Salvarea temporară și încărcarea pe Firebase
    temp_path = f"temp_{filename}"
    video_file.save(temp_path)

    # Utilizează MoviePy pentru a afla durata videoclipului
    # with VideoFileClip(temp_path) as video:
    #     duration = video.duration  # Durata în secunde

    storage_path = f"LiveRecordings/{user_id}/{filename}"
    storage.child(storage_path).put(temp_path)
    file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)

    # Adaugă informațiile în Firebase Realtime Database, inclusiv durata
    db.child("UserCaptures").child("LiveRecordings").child(user_id).child(unique_id).set({
        "details": {
            "timestamp": date_time,
            "size":  f"{file_size_in_mb:.2f} MB",
            "filename": filename,
            "storage_path": storage_path
            # ,
            # "duration": f"{duration:.2f} seconds"  # Adaugă durata aici
        }
    })

    # Șterge fișierul temporar
    os.remove(temp_path)

    return jsonify({"message": "Video uploaded successfully"})


# storage
@app.route('/storage')
def storage_page():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    return render_template('storage.html')

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

            if selected_date:
                if image_date == selected_date:
                    images.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp
                    })
            else:
                images.append({
                    'url': url,
                    'size': size,
                    'timestamp': timestamp
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
            if selected_date:
                if video_date == selected_date:
                    videos.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp
                    })
            else:
                videos.append({
                    'url': url,
                    'size': size,
                    'timestamp': timestamp
                })

    return jsonify(videos)


# logout function
@app.route('/logout')
def logout():
    session.pop('user')
    return redirect('/')
 
 
if __name__ == "__main__":
    app.run(debug=True)
