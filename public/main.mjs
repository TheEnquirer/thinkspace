// INITIALIZE

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';
//import { Interaction } from 'https://cdn.skypack.dev/pin/three.interaction@v0.2.3-OWhEAGFgFHqRauqtJEO2/mode=imports/optimized/three.interaction.js';

const scene = new THREE.Scene(); // init scene
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 ); // init camera
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer(); // init renderer
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


let controls = new FirstPersonControls( camera, renderer.domElement );
controls.movementSpeed = 10;
controls.lookSpeed = 0.05;

// MESHES

class ClickableObject {
    constructor(mesh, callback) {
	this.mesh = mesh;
	this.callback = callback;

	scene.add( this.mesh );
	this.mesh.cursor = 'pointer';
	this.mesh.callback = this.callback;
    }
}


const cubemesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
const cube = new ClickableObject(
    cubemesh, () => {console.log("testin")}
)


window.addEventListener('keydown', onDocumentKeyDown, false);

function onDocumentKeyDown( e ) {
    if (e.which == 32) {
	console.log("space")
    }
}


window.addEventListener('click', onDocumentMouseDown, false);
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
function onDocumentMouseDown( event ) {
    event.preventDefault();
    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    raycaster.setFromCamera( mouse, camera );
    //console.log(scene.children, "children");
    var intersects = raycaster.intersectObjects( scene.children );
    //console.log(intersects[0]);
    if ( intersects.length > 0 ) {
	intersects[0].object.callback(event);
}}


camera.position.z = 5;


// ANIMATION LOOP

function animate() {
    requestAnimationFrame( animate );
    controls.update( clock.getDelta() );
    //cube.rotation.x += 0.01;
    cube.mesh.rotation.y += 0.01;
    renderer.render( scene, camera );
}
animate();



