// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://incandescent-fire-128.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"});
    display_msg({m:"When sending emoticons, type them in your message. </br> Once you hit enter you will begin recording a 3 second video to send as the emoticon", c:"red"});
    display_msg({m:"Accepted emoticons are : lol,:),:-),:(,:-(, :'(, >:O,", c:"red"});
    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    document.username = username;
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        document.message_sent = false;
        var curr_emotion = has_emotions($(this).val());
        if(curr_emotion){
          document.noVideo = true;
          document.record(curr_emotion);
          var message = $(this).val();
          document.sendMessage = function() {
            if (! cur_video_blob || document.message_sent)
              return; 
            fb_instance_stream.push({m:username+": " +message, v:cur_video_blob, c: my_color, emotion:curr_emotion});
            document.message_sent = true;
          }
        }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        }
        $(this).val("");
        scroll_to_bottom(0);
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  function send_message() {

  }


  function lol_call_back(wrapper) {
    wrapper.setAttribute("id", "lol_animation");
    setInterval(function() {
      wrapper.setAttribute("id", "");
    }, 3000);
  }
  // creates a message node and appends it to the conversation
  function display_msg(data){
    var username_from_msg = data.m.substr(0, data.m.indexOf(":"));
    var from_me = false;
    if (username_from_msg == document.username)
      from_me = true;
    var style_str = from_me ? "style='float:right'" : ""
    var class_to_add = from_me ? " my_msg" : "";
    $("#conversation").append("<div class='msg_wrapper_wrapper " + class_to_add + "'><div class='msg_wrapper'" + style_str + "><div class='msg' style='color:"+data.c+"'><p>"+data.m+ "</p></div></div></div>");
    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = false;
      video.controls = false; // optional
      video.loop = false;
      video.width = 120;
      var animation_callback = undefined;
      
      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));
      

     
      $(".msg_wrapper").last().append("<div class=\"video_wrapper\"></div>");
      var wrapper = $(".video_wrapper").last();
      wrapper.append("<div class=\"video_overlay\"><p>CLICK TO PLAY</p></div>");
      wrapper.append(video);


      switch (data.emotion) {
        case "lol":
          wrapper.click(function() {
            $(this).find("video")[0].play();
            wrapper.attr("id", "lol_animation");
            setTimeout(function() {
              wrapper.attr("id", "");
              }, 3000);
          });
          break;
        case ">:O":  
          wrapper.click(function () {
            $(this).find("video")[0].play();
            wrapper.attr("id", "angry_animation");
            setTimeout(function() {
              wrapper.attr("id", "");
              }, 3000);

          });
          break;
        case ":-)":
        case ":)":
          wrapper.click(function() {
            $(this).find("video")[0].play();
            wrapper.attr("id", "happy_animation");
            setTimeout(function() {
              wrapper.attr("id", "");
              }, 3000);

          });
          break;
        case ":(":
        case ":-(":
        case ":'(":
          wrapper.click(function() {
            $(this).find("video")[0].play();
            wrapper.attr("id", "sad_animation");
            setTimeout(function() {
              wrapper.attr("id", "");
              }, 3000);

          });
          break
        // case ":$":
        // case ":-$":
        //   wrapper.click(function() {
        //     $(this).find("video")[0].play();
        //     wrapper.attr("id", "embarassed_animation");
        //     setTimeout(function() {
        //       wrapper.attr("id", "");
        //       }, 3000);

        //   });

      }


      //document.getElementsByClassName("animate").last.appendChild(video);
      
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      // var time = 0;
      // var second_counter = document.getElementById('second_counter');
      // var second_counter_update = setInterval(function(){
      //   second_counter.innerHTML = time++;
      // },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      var mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;
      
      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
            document.sendMessage();
            $("#submission input").prop("disabled", false);
            
          });
      };

      document.record = function(emotion) {
        $("#submission input").prop("disabled", true);
        $("#webcam_stream").append("<div id='vid_timer'><p> Recording video for "+emotion+" </br> <span id='vid_counter'>3</span></p></div>");
        $("#webcam_stream video").css( {
          'width' : '320px',
          'height' : '240px'
        });
        $("#webcam_stream").css( {
          'position' : 'absolute',
          'top' : '10%',
          'left' : '50%',
          'margin-left' : '-160px'
        })
        mediaRecorder.start(3000);
        var second_counter = setInterval(function () {
          $('#vid_counter').text($('#vid_counter').text() - 1);
        }, 1000);
        setTimeout(function() {
          mediaRecorder.stop();
          $("#webcam_stream").removeAttr('style');
          $("#webcam_stream video").removeAttr('style');
          $("#vid_timer").remove();
          clearInterval(second_counter);

        }, 3000);
        
      }
      // setInterval( function() {
      //   mediaRecorder.stop();
      //   mediaRecorder.start(3000);
      // }, 3000 );
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  //returns the emoticon found in the chat message
  var has_emotions = function(msg){
    var options = ["lol",":)",":-)",":(",":-(", ":'(", ">:O"];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return options[i];
      }
    }
    return undefined;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
