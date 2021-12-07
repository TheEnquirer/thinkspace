// INITIALIZE

//import * as THREE from 'three';
//import { Scene, PerspectiveCamera, WebGLRenderer, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
//import { Interaction } from 'three.interaction';
//import { Interaction } from 'three.interaction';

//import * as THREE from 'https://cdn.skypack.dev/three@<version>';
import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
//import { Scene, Clock, PerspectiveCamera, WebGLRenderer, Mesh, BoxGeometry, MeshBasicMaterial } from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';
//import { Interaction } from './node_modules/three.interaction';
import { Interaction } from 'https://cdn.skypack.dev/pin/three.interaction@v0.2.3-OWhEAGFgFHqRauqtJEO2/mode=imports/optimized/three.interaction.js';
//console.log(Interaction)
//import three from 'https://cdn.skypack.dev/three';
//console.log(three)


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
const interaction = new Interaction(renderer, scene, camera);
//scene.add( player );

// MESHES

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );



//const cube = new THREE.Mesh( geometry, material );
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
);

//cube.cursor = 'pointer';
//cube.on('click', function(ev) {console.log("clisin")});
scene.add( cube );
cube.cursor = 'pointer';
cube.callback = function () { console.log("callbacked!") }

//cube.on('click', function(ev) {console.log("clicked", ev)});
console.log(interaction, cube)
//interaction.onClick()
//console.log(cube)

//var vector = new THREE.Vector3(
//     (camera.position.x / window.innerWidth) * 2 - 1, 
//     - (camera.position.y / window.innerHeight) * 2 + 1, 
//                0.5 );

//var rayCaster = projector.unprojectVector(vector, camera);

//var intersectedObjects = rayCaster.intersectObjects(objects);
//console.log(intersectedObjects);





window.addEventListener('click', onDocumentMouseDown, false);

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

function onDocumentMouseDown( event ) {
    event.preventDefault();
    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    raycaster.setFromCamera( mouse, camera );
    console.log(scene.children, "children");
    var intersects = raycaster.intersectObjects( scene.children );
    console.log(intersects[0]);
    if ( intersects.length > 0 ) {
	intersects[0].object.callback();
}}

//var mesh_menu_title = new THREE.Mesh(geometry_menu, materials_menu);
//mesh_menu_title.name = 'select_lang';
//mesh_menu_title.callback = function() { select_language();}
//scene.add(mesh_menu_title);

//function select_language(){
//    var selectedObject = scene.getObjectByName("select_lang"); 
//    scene.remove( selectedObject );
//    var selectedObject = scene.getObjectByName("start");
//    scene.remove( selectedObject );
//    var selectedObject = scene.getObjectByName("menu");
//    scene.remove( selectedObject );
//}



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



