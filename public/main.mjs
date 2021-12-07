// INITIALIZE
//import * as THREE from 'three';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';

//import { FirstPersonControls } from './jsm/controls/FirstPersonControls.js';

const scene = new THREE.Scene(); // init scene
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 ); // init camera
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer(); // init renderer
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


let controls = new FirstPersonControls( camera, renderer.domElement );
controls.movementSpeed = 10;
controls.lookSpeed = 0.05;
//scene.add( player );

// MESHES

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );


camera.position.z = 5;


// ANIMATION LOOP

function animate() {
    requestAnimationFrame( animate );
    controls.update( clock.getDelta() );
    //cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render( scene, camera );
}
animate();



