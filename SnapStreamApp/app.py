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
import requests

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


#######################################################################
############################ REGISTER PAGE ############################ 
#######################################################################
@app.route('/register', methods=['POST'])
def register():
    # preluare informatii din formularul completat
    regUsername = request.form['regUsername'].strip()
    regName = request.form['regName'].strip()
    regEmail = request.form['regEmail'].strip()
    regPassword = request.form['regPassword'].strip()
    regPhone = request.form['regPhone'].strip()
    regCameras = request.form['regCamera'].split(',')

    print("Name", regName)
    print("Selected Cameras", regCameras)

    try:
        user = auth.create_user_with_email_and_password(regEmail, regPassword)
        uid = user['localId']
        data = {"username": regUsername, "name": regName, "email": regEmail, "phone": regPhone}
        db.child("Users").child(uid).set(data)

        user_cameras = {}
        for camera in regCameras:
            camera_ip = db.child("Cameras").child(camera).get().val()
            user_cameras[camera] = camera_ip
        
        db.child("UsersCameras").child(uid).set(user_cameras)

        flash('Account created successfully! Please log in.', 'success')
        return jsonify({'success': True, 'redirect': url_for('index')})
    except Exception as e:
        flash('An account with this email address already exists. Please use a different email.', 'danger')
        print(e)

        return jsonify({'success': False, 'message': 'An account with this email address already exists. Please use a different email.'})

# get list of cameras
@app.route('/get_cameras', methods=['GET'])
def get_cameras():
    cameras = db.child("Cameras").get()
    camera_keys = []
    if cameras.each():
        for camera in cameras.each():
            camera_keys.append(camera.key())
    print("Camera keys:", camera_keys)
    return jsonify(camera_keys)

#######################################################################
############################# LOGIN PAGE ############################## 
#######################################################################
@app.route('/', methods=['POST', 'GET'])
def index():
    if 'user' in session:
        return redirect(url_for('home')) 

    login_message = None
    alert_class = None
    get_cameras()
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


@app.route('/upload_manual_video', methods=['POST'])
def upload_manual_video():
    try:
        video_file = request.files['video']
        if not video_file:
            return jsonify({"error": "No video part"}), 400

        if 'user' not in session:
            return jsonify({"error": "User not authenticated"}), 403  
        
        user_id = session['user_id']
        selected_camera = request.form.get('camera', 'unknown') 

        storage_path = f"LiveRecordings/{user_id}/{selected_camera}"
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = secure_filename(f"{selected_camera}_{user_id}_{unique_id}_{timestamp}.mp4")

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
            db.child("UserCaptures").child("LiveRecordings").child(user_id).child(selected_camera).push({
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

    selected_camera = data.get('camera', 'unknown')
    unique_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
    date_time = datetime.now().strftime("%d %b %Y %H:%M:%S")
    unique_filename = f"{selected_camera}_{user_id}_{timestamp}.png"
    temp_path = f"temp_{unique_filename}"
    image.save(temp_path)

    storage_path = f"LiveCaptures/{user_id}/{selected_camera}/{unique_filename}"
    storage.child(storage_path).put(temp_path)
    file_size_in_mb = os.path.getsize(temp_path) / (1024 * 1024)

    db.child("UserCaptures").child("LiveCaptures").child(user_id).child(selected_camera).child(unique_id).set({
        "details": {
            "timestamp": date_time,
            "size":  f"{file_size_in_mb:.2f} MB",
            "filename": unique_filename,
            "storage_path": storage_path
        }
    })

    os.remove(temp_path)
    return jsonify({"message": "The image has been successfully saved!"})

# def allowed_file(filename):
#     ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg'}
#     return '.' in filename and \
#            filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# storage
@app.route('/storage')
def storage_page():
    if 'user' in session:
        username = session.get('username', '')
        return render_template('storage.html', username=username)
    else:
        return redirect(url_for('index'))


##########################################################
# ////////////////////// GET DATA ////////////////////// #
##########################################################

@app.route('/get_images')
def get_images():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    selected_camera = request.args.get('camera', 'all')

    user_cameras = db.child("UsersCameras").child(user_id).get()
    if not user_cameras.val():
        return jsonify([])  # Nu sunt camere asociate

    images = []
    for camera in user_cameras.each():
        camera_name = camera.key()

        if selected_camera != 'all' and camera_name != selected_camera:
            continue

        images_details = db.child("UserCaptures").child("LiveCaptures").child(user_id).child(camera_name).get()

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
                            'storage_path': storage_path,
                            'camera_name': camera_name  
                        })
                else:
                    images.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path,
                        'camera_name': camera_name
                    })

    return jsonify(images)


@app.route('/get_autoimages')
def get_autoimages():
    if 'user' not in session:
        return jsonify([])

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    selected_camera = request.args.get('camera', 'all')

    user_cameras = db.child("UsersCameras").child(user_id).get()
    if not user_cameras.val():
        return jsonify([])  # Nu sunt camere asociate

    images = []
    for camera in user_cameras.each():
        camera_name = camera.key()

        if selected_camera != 'all' and camera_name != selected_camera:
            continue

        images_details = db.child("UserCaptures").child("AutoLiveCaptures").child(camera_name).get()
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
                            'storage_path': storage_path,
                            'camera_name': camera_name  
                        })
                else:
                    images.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path,
                        'camera_name': camera_name  
                    })

    return jsonify(images)




@app.route('/get_videos')
def get_videos():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    selected_camera = request.args.get('camera', 'all')

    user_cameras = db.child("UsersCameras").child(user_id).get()
    if not user_cameras.val():
        return jsonify([])  # Nu sunt camere asociate

    videos = [] 
    for camera in user_cameras.each():
        camera_name = camera.key()

        if selected_camera != 'all' and camera_name != selected_camera:
            continue

        video_details = db.child("UserCaptures").child("LiveRecordings").child(user_id).child(camera_name).get()
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
                            'storage_path': storage_path,
                            'camera_name': camera_name  
                        })
                else:
                    videos.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path,
                        'camera_name': camera_name  
                    })

    return jsonify(videos)


@app.route('/get_autovideos')
def get_autovideos():
    if 'user' not in session:
        return jsonify([])  

    user_id = session['user_id']
    selected_date = request.args.get('date', '')
    selected_camera = request.args.get('camera', 'all')

    user_cameras = db.child("UsersCameras").child(user_id).get()
    if not user_cameras.val():
        return jsonify([])  # Nu sunt camere asociate
    
    videos = [] 
    for camera in user_cameras.each():
        camera_name = camera.key()

        if selected_camera != 'all' and camera_name != selected_camera:
            continue

        video_details = db.child("UserCaptures").child("AutoLiveRecordings").child(camera_name).get()

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
                            'storage_path': storage_path,
                            'camera_name': camera_name  
                        })
                else:
                    videos.append({
                        'url': url,
                        'size': size,
                        'timestamp': timestamp,
                        'unique_id': unique_id,
                        'storage_path': storage_path,
                        'camera_name': camera_name  
                    })

    return jsonify(videos)


##########################################################
# /////////////////////// DELETE /////////////////////// #
##########################################################

# delete image
@app.route('/delete_image', methods=['POST'])
def delete_image():
    if 'user' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unique_id = data.get('unique_id')
    camera_name = data.get('camera_name')

    try:
        db.child("UserCaptures").child("LiveCaptures").child(user_id).child(camera_name).child(unique_id).remove()

        return jsonify({'status': 'success', 'message': 'Image deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete image: {}'.format(str(e))}), 500
    
# delete auto live captures
@app.route('/delete_autoimage', methods=['POST'])
def delete_autoimage():
    if 'user' not in session:
        return jsonify({'status': 'error', 'message': 'User not logged in'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unique_id = data.get('unique_id')
    camera_name = data.get('camera_name')

    try:
        db.child("UserCaptures").child("AutoLiveCaptures").child(camera_name).child(unique_id).remove()

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
    camera_name = data.get('camera_name')

    try:

        db.child("UserCaptures").child("LiveRecordings").child(user_id).child(camera_name).child(unique_id).remove()

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
    camera_name = data.get('camera_name')

    try:
        db.child("UserCaptures").child("AutoLiveRecordings").child(camera_name).child(unique_id).remove()

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


@app.route('/get_user_cameras', methods=['GET'])
def get_user_cameras():
    if 'user_id' not in session:
        return jsonify({"error": "User not authenticated"}), 403

    user_id = session['user_id']

    try:
        cameras_data = db.child("UsersCameras").child(user_id).get().val()
        
        if cameras_data:
            cameras = list(cameras_data.keys())
            return jsonify(cameras), 200
        else:
            return jsonify({"error": "No cameras found for this user"}), 404
    except Exception as e:
        print("Error getting user cameras from Firebase:", e)
        return jsonify({"error": "An error occurred while retrieving user cameras"}), 500


@app.route('/get_camera_ip', methods=['GET'])
def get_camera_ip():
    camera_name = request.args.get('camera')
    if not camera_name:
        return jsonify({"error": "Camera name not provided"}), 400

    try:
        camera_ip = db.child("Cameras").child(camera_name).get().val()
        if camera_ip:
            return jsonify({"ip_address": camera_ip}), 200
        else:
            return jsonify({"error": "Camera IP not found"}), 404
    except Exception as e:
        print("Error getting camera IP from Firebase:", e)
        return jsonify({"error": "An error occurred while retrieving camera IP"}), 500



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


# @app.route('/fetch_image', methods=['POST'])
# def fetch_image():
#     image_url = request.json['url']
#     try:
#         response = requests.get(image_url)
#         response.raise_for_status()
#         return jsonify({"image_data": base64.b64encode(response.content).decode('utf-8')})
#     except requests.RequestException as e:
#         return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    try:
        app.run(debug=True, use_reloader=False)#, port=5001)
    except KeyboardInterrupt:
        pass
    finally:
        print("Application stopped.")
