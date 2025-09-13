// Two sets: Background vs Polaroids
// Put your filenames (relative to this folder). Example:
// window.BACKGROUND_MANIFEST = ["bg1.jpg", "bg2.jpg"];
// window.POLAROID_MANIFEST   = ["p1.jpg", "p2.jpg"];

window.BACKGROUND_MANIFEST = (typeof window.BACKGROUND_MANIFEST !== 'undefined') ? window.BACKGROUND_MANIFEST : [];
window.POLAROID_MANIFEST   = (typeof window.POLAROID_MANIFEST !== 'undefined')   ? window.POLAROID_MANIFEST   : [];

window.BACKGROUND_MANIFEST = [
    "ava.jpg", 
    "bowl.jpg",
    "dolo.jpg",
    "fremont.jpg"
];
window.POLAROID_MANIFEST   = [
    "photo_01.jpg",
    "photo_02.jpg",
    "photo_03.jpg",
    "photo_04.jpg",
    "photo_05.jpg",
    "photo_06.jpg",
    "photo_07.jpg",
    "photo_08.jpg",
    "photo_09.jpg",
    "photo_10.jpg",
    "photo_11.jpg",
    "photo_12.jpg",
    "photo_13.jpg",
];

// Back-compat (optional): if you only set PHOTO_MANIFEST, both features use it.
// window.PHOTO_MANIFEST = ["photo_01.jpg","photo_02.jpg"];
