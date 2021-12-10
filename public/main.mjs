// INITIALIZE

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';

import { Sky } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Sky.js'

import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';


import { GUI } from 'https://cdn.skypack.dev/three/examples/jsm/libs/lil-gui.module.min.js';

//import { Interaction } from 'https://cdn.skypack.dev/pin/three.interaction@v0.2.3-OWhEAGFgFHqRauqtJEO2/mode=imports/optimized/three.interaction.js';

const loader = new GLTFLoader();
const scene = new THREE.Scene(); // init scene
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 ); // init camera
const clock = new THREE.Clock();

const light = new THREE.AmbientLight(0x404040);
scene.add(light);

const renderer = new THREE.WebGLRenderer({antialias: true}); // init renderer
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
let sky, sun;


let controls = new FirstPersonControls( camera, renderer.domElement );
controls.movementSpeed = 10;
controls.lookSpeed = 0.05;

// dead zone for controls
(() => {
    document.addEventListener('mousemove', e => {
        const deadspace = 0.1;  // of the entire width/height of the scene
        if (Math.abs(controls.mouseX) < renderer.domElement.width  * deadspace / 2 &&
            Math.abs(controls.mouseY) < renderer.domElement.height * deadspace / 2) {
            controls.activeLook = false;
        } else {
            controls.activeLook = true;
        }
    })


    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
})();


function initSky() {

    // Add Sky
    sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    sun = new THREE.Vector3();

    /// GUI

    const effectController = {
	turbidity: 10,
	rayleigh: 3,
	mieCoefficient: 0.005,
	mieDirectionalG: 0.7,
	elevation: 2,
	azimuth: 180,
	exposure: renderer.toneMappingExposure
    };

    function guiChanged() {

	const uniforms = sky.material.uniforms;
	uniforms[ 'turbidity' ].value = effectController.turbidity;
	uniforms[ 'rayleigh' ].value = effectController.rayleigh;
	uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
	uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

	const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
	const theta = THREE.MathUtils.degToRad( effectController.azimuth );

	sun.setFromSphericalCoords( 1, phi, theta );

	uniforms[ 'sunPosition' ].value.copy( sun );

	renderer.toneMappingExposure = effectController.exposure;
	renderer.render( scene, camera );

    }

    //const gui = new GUI();

    //gui.add( effectController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( guiChanged );
    //gui.add( effectController, 'rayleigh', 0.0, 4, 0.001 ).onChange( guiChanged );
    //gui.add( effectController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( guiChanged );
    //gui.add( effectController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( guiChanged );
    //gui.add( effectController, 'elevation', 0, 90, 0.1 ).onChange( guiChanged );
    //gui.add( effectController, 'azimuth', - 180, 180, 0.1 ).onChange( guiChanged );
    //gui.add( effectController, 'exposure', 0, 1, 0.0001 ).onChange( guiChanged );

    guiChanged();

}
initSky()


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

const model = await new Promise((res, rej) => {
    loader.load('models/untitled.glb', gltf => {
        console.log('got', gltf);
        res(gltf);
    }, undefined, rej);
});
model.scene.scale.x = 1;
model.scene.scale.y = 1;
model.scene.scale.z = 1;
model.scene.position.x = 1;
//model.scene.children[2].visible = false;
console.log(model.scene.children[2])


//scene.add(model.scene);  // TODO @TheEnquirer not sure how to meshify this
// @exr0n done :)

const defaultCube = new ClickableObject(
    model.scene.children[2], () => {console.log("the defaultCube!")}
)
defaultCube.mesh.position.y = 3;


const cubemesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
const cube = new ClickableObject(
    cubemesh, () => {console.log("testin")}
)


window.addEventListener('keydown', onDocumentKeyDown, false);
window.addEventListener('keyup', onDocumentKeyUp, false);

let up = false;
let down = false;
let fasterTurn = false;
let lockTurn = false;
function onDocumentKeyDown( e ) {
    //console.log(e)
    if (e.which == 81) {
	up = true;
    } else if (e.which == 69) {
	down = true;
    } else if (e.which == 16) {
	fasterTurn = true;
    } else if (e.which == 91) {
	lockTurn = true;
    }
}

function onDocumentKeyUp( e ) {
    if (e.which == 81) {
	up = false;
    } else if (e.which == 69) {
	down = false;
    } else if (e.which == 16) {
	fasterTurn = false;
    } else if (e.which == 91) {
	lockTurn = false;
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
	//console.log(intersects, "intersects!")
	intersects[0].object.callback(event);
}}


camera.position.z = 5;


// ANIMATION LOOP

function animate() {
    requestAnimationFrame( animate );
    renderer.setSize( window.innerWidth, window.innerHeight );
    if (lockTurn) { controls.activeLook = false } else { controls.activeLook = true }
    //console.log(flying)
    if (up) { camera.position.y += 0.1; }

    if (down) { camera.position.y -= 0.1; }

    if (fasterTurn) { controls.lookSpeed = 0.3 } else { controls.lookSpeed = 0.1 }
    // event handling

    //cube.rotation.x += 0.01;
    cube.mesh.rotation.y += 0.01;
    //defaultCube.mesh.rotation.y -= 0.01;

    controls.update( clock.getDelta() );
    renderer.render( scene, camera );
}
animate();


document.addEventListener('resize', e => {
    // TODO handle resizes
    console.log('resized!')
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
});

