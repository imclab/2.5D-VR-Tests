Math.TAU = 2*Math.PI;

//////////////////////////////////////////////////////
// SET UP EVERYTHING
//////////////////////////////////////////////////////

var renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setClearColor( 0xFFFFFF, 1 ); // the default
document.body.appendChild(renderer.domElement);
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.y = 40;
var controls = new THREE.VRControls(camera);
var effect = new THREE.VREffect(renderer);
effect.setSize(window.innerWidth, window.innerHeight);
var vrmgr = new WebVRManager(effect);

//////////////////////////////////////////////////////
// CONVERT TO 2.5D SCENE
//////////////////////////////////////////////////////

var loader = new createjs.LoadQueue(false);
loader.installPlugin(createjs.Sound);
loader.addEventListener("complete", handleComplete);
loader.loadManifest([
	{src:"animation/sounds/hoot.mp3", id:"hoot"}
]);

createjs.Sound.alternateExtensions = ["ogg"];

var sprites = [];

function handleComplete() {

	root = new lib.animatic_canvas();
	root.isSprite = true;

	stage = new createjs.Stage();
	stage.addChild(root);
	stage._tick();

	// All of root's current & future children, unless they're guides.
	// hack - children detected with this flag: nominalBounds

	for(var propName in root){
		var prop = root[propName];
		if(!prop || !prop.nominalBounds || propName.charAt(0)=="_") continue;
		
		var mc = prop;
		var sprite = new CanvasSprite(mc);
		scene.add(sprite.mesh);
		sprites.push(sprite);

	}

	animate();

}

// This is a super-simplistic pan
// It only takes into account your Y-rotation
// Whatever

function getSoundPan(mc){

	var pLocal = new THREE.Vector3( 0, 0, -1 );
	var pWorld = pLocal.applyMatrix4( camera.matrixWorld );
	var direction = pWorld.sub(camera.position).normalize();
	var camAngle = Math.atan2(direction.z,direction.x);

	var x = mc.x - root._stage.x;
	var y = mc.y - root._stage.y;
	var sourceAngle = Math.atan2(y,x);

	var angle = sourceAngle-camAngle;
	var pan = Math.sin(angle);

	return pan;
}

var soundObjects = [];
function playSFX(id, mc) {

	var soundInstance = createjs.Sound.play(id, {
		interrupt: createjs.Sound.INTERRUPT_EARLY,
		delay: 0,
		offset: 0,
		loop: 0,
		volume: mc.scaleX, // scale for volume, how cute! <3
		pan: getSoundPan(mc)
	});

	var soundObject = { mc:mc, soundInstance:soundInstance };

	soundObjects.push(soundObject);
	soundInstance.on("complete", function(){
		var i = soundObjects.indexOf(soundObject);
		if(i<0) return;
		soundObjects.splice(i,1);
	});

}
function playSound(){}



//////////////////////////////////////////////////////
// ANIMATION LOOP
//////////////////////////////////////////////////////

// Request animation frame loop function
function animate() {

	stats.begin();

	// Animate CreateJS - p.s. 30 FPS looks weird
    stage._tick();
    for(var i=0;i<sprites.length;i++){
    	sprites[i].draw();
    }

    // Sound pans
    for(var i=0;i<soundObjects.length;i++){
	    var sound = soundObjects[i];
	    sound.soundInstance.setPan(getSoundPan(sound.mc));
	}

	// Update VR headset position and apply to camera.
	controls.update();

	// Render the scene through the VREffect, but only if it's in VR mode.
	if(vrmgr.isVRMode()) {
		effect.render(scene, camera);
	} else {
		renderer.render(scene, camera);
	}

	// End
	stats.end();
	requestAnimationFrame(animate);

}


//////////////////////////////////////////////////////
// MISC STUFF I GUESS
//////////////////////////////////////////////////////

// Listen for keyboard event and zero positional sensor on appropriate keypress.
function onKey(event) {
    if (event.keyCode == 90) { // z
        controls.zeroSensor();
    }
};
window.addEventListener('keydown', onKey, true);

// Handle window resizes
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	effect.setSize( window.innerWidth, window.innerHeight );
}
window.addEventListener('resize', onWindowResize, false);

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild( stats.domElement );

