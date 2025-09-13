QUICK SETUP
-----------
1) Put your music in /assets/ with exact names:
     • splash_theme.mp3  (plays on the splash, loops)
     • game_song.mp3     (starts when you press Enter)
2) Put your photos in /assets/photos/ and list them in /assets/photos/manifest.js:

     window.BACKGROUND_MANIFEST = ["bg1.jpg", "bg2.jpg"];
     window.POLAROID_MANIFEST   = ["p1.jpg", "p2.jpg"];

   (If you prefer, use the in-game buttons "Load Background Photos" and "Load Polaroid Photos".)

NOTE: This bundle works offline from file://. If autoplay is blocked, tap once.

CONTROLS
--------
P1: A S D F • P2: J K L ; • Space: Pause/Resume • R: Restart
