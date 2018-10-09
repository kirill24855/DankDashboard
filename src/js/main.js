/*
* Done with globe and country borders
* Now, looking for a higher-res globe texture, maybe
* Also need to get data for all states of the US, and maybe other large countries like Russia, Canada, etc
* Gotta configure some type of networking and listening for data from a server, so as to update the sticks in real time
* Add labels to countries and sticks?
* Make sticks' length represent a number (people or some such)
* Change appearance of sticks to signify important notifications (errors, closed deals, etc)
*/

shp("maps/TM_WORLD_BORDERS-0.3").then(function (geojson) {
	addBordersToScene(geojson);
});

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 50);
camera.position.z = 2;

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

// rotation by mouse click
new THREE.OrbitControls(camera, renderer.domElement);

// lights
const lights = [];
lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 0 ].position.set( 0, 200, 0 );
lights[ 1 ].position.set( 100, 200, 100 );
lights[ 2 ].position.set( - 100, - 200, - 100 );
scene.add( lights[ 0 ] );
scene.add( lights[ 1 ] );
scene.add( lights[ 2 ] );

// equator, parallels, and meridians
function addMarkers(numParallels, numMeridians) {
	let markerMaterial = new THREE.LineBasicMaterial({color: 0xeffeff});
	let equatorGeometry = new THREE.CircleGeometry(1, 360);
	equatorGeometry.vertices.shift();

	// equator
	let equatorMesh = new THREE.LineLoop(equatorGeometry, markerMaterial);
	equatorMesh.rotation.x = Math.PI/2;
	scene.add(equatorMesh);

	// latitudes
	for (let i = 0; i < Math.PI/2; i+= Math.PI/2/(numParallels+1)) {
		let parallelGeometry = new THREE.CircleGeometry(Math.cos(i), 360);
		parallelGeometry.vertices.shift();
		let parallelMesh = new THREE.LineLoop(parallelGeometry, markerMaterial);
		parallelMesh.rotation.x = Math.PI/2;
		parallelMesh.position.y = Math.sin(i);
		scene.add(parallelMesh);

		parallelMesh = new THREE.LineLoop(parallelGeometry, markerMaterial);
		parallelMesh.rotation.x = Math.PI/2;
		parallelMesh.position.y = -Math.sin(i);
		scene.add(parallelMesh);
	}

	// meridians
	for (let i = 0; i < 2*Math.PI; i += 2*Math.PI/numMeridians) {
		let meridianMesh = new THREE.LineLoop(equatorGeometry, markerMaterial);
		meridianMesh.rotation.y = i;
		scene.add(meridianMesh);
	}
}
addMarkers(2, 12);

let borderMaterial = new THREE.LineBasicMaterial({color: 0x4cc4ff});

function addBordersToScene(geojson) {
	// use to find buggy countries
	//geojson.features = geojson.features.filter(rec => rec.properties.NAME === "Namibia");
	//debugger;

	// every country
	for (let i = 0; i < geojson.features.length; i++) {
		//let i = 144;
		let country = geojson.features[i];

		// every unconnected part of the country
		for (let j = 0; j < country.geometry.coordinates.length; j++) {
			let part;
			if (country.geometry.coordinates[0][0][0] instanceof Array) part = country.geometry.coordinates[j][0];
			else part = country.geometry.coordinates[j];
			let coordinates = [];

			// every point of the border of the part
			for (let k = 0; k < part.length; k++) {
				let coords = part[k];
				let lat = coords[1] * Math.PI / 180;
				let lng = coords[0] * Math.PI / 180;
				let point = new THREE.Vector3(Math.sin(lng) * Math.cos(lat), Math.sin(lat), Math.cos(lng) * Math.cos(lat));
				coordinates.push(point);
			}

			let geometry = new THREE.Geometry();
			geometry.vertices = coordinates;
			let line = new THREE.Line(geometry, borderMaterial);
			scene.add(line);
		}
	}
}

// earth texture
let earth = new THREE.Group();
let texLoader = new THREE.TextureLoader();
texLoader.load("img/earthnight8k.jpg", function(tex) {
	let geometry = new THREE.SphereGeometry(1, 360, 180);
	let material = new THREE.MeshBasicMaterial({map: tex, overdraw: 0.5/*color: 0x050505*/});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.rotateY(3*Math.PI/2);
	earth.add(mesh);
});
scene.add(earth);

// sticks
const stickWidth = 0.005;
let sticks = [];

function addStick(lat, lng, length) {
	let geometry = new THREE.BoxGeometry(stickWidth, stickWidth, length, 1, 1, 1);
	let material = new THREE.MeshPhongMaterial({color: 0x4cc4ff});
	let stickMesh = new THREE.Mesh(geometry, material);
	let pivot = new THREE.Object3D();
	pivot.add(stickMesh);
	stickMesh.pivot = pivot;
	stickMesh.position.set(0, 0, 1 + length/2);

	rotateMesh(stickMesh, lat, lng);

	sticks.push({
		lat: lat,
		lng: lng,
		length: length,
		mesh: stickMesh
	});

	scene.add(pivot);
}

let xAxis = new THREE.Vector3(1, 0, 0);
let yAxis = new THREE.Vector3(0, 1, 0);
let zAxis = new THREE.Vector3(0, 0, 1);

function rotateMesh(mesh, lat, lng) {
	rotateAroundWorldAxis(mesh.pivot, xAxis, -lat * Math.PI / 180);
	rotateAroundWorldAxis(mesh.pivot, yAxis,  lng * Math.PI / 180);
}

function rotateAroundWorldAxis(object, axis, radians) {
	let rotWorldMatrix = new THREE.Matrix4();
	rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
	rotWorldMatrix.multiply(object.matrix);			// pre-multiply
	object.matrix = rotWorldMatrix;
	object.rotation.setFromRotationMatrix(object.matrix);
}

function render() {
	requestAnimationFrame(render);
	renderer.render(scene, camera);
}

window.addEventListener( 'resize', function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}, false );

render();
