
import { ClipVolume } from "./ClipVolume.js";
import { PolygonClipVolume } from "./PolygonClipVolume.js";
import { EventDispatcher } from "../EventDispatcher.js";

export class ClippingTool extends EventDispatcher {

	constructor(viewer) {
		super();

		this.viewer = viewer;

		this.maxPolygonVertices = 1000;

		this.addEventListener("start_inserting_clipping_volume", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});

		this.sceneMarker = new THREE.Scene();
		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = "scene_clip_volume";
		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};

		this.onAdd = e => {
			this.sceneVolume.add(e.volume);
		};

		this.viewer.inputHandler.addEventListener("delete", e => {
			let volumes = e.selection.filter(e => (e instanceof ClipVolume));
			volumes.forEach(e => this.viewer.scene.removeClipVolume(e));
			let polyVolumes = e.selection.filter(e => (e instanceof PolygonClipVolume));
			polyVolumes.forEach(e => this.viewer.scene.removePolygonClipVolume(e));
		});
		this.cancelReset = () => { }
	}

	setScene(scene) {
		if (this.scene === scene) {
			return;
		}

		if (this.scene) {
			this.scene.removeEventListeners("clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("clip_volume_removed", this.onRemove);
			this.scene.removeEventListeners("polygon_clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("polygon_clip_volume_removed", this.onRemove);
		}

		this.scene = scene;

		this.scene.addEventListener("clip_volume_added", this.onAdd);
		this.scene.addEventListener("clip_volume_removed", this.onRemove);
		this.scene.addEventListener("polygon_clip_volume_added", this.onAdd);
		this.scene.addEventListener("polygon_clip_volume_removed", this.onRemove);
	}

	cancelResetFactory(onMouseUp, insertionCallback, onMouseDown, cancel) {
		return () => {
			this.viewer.renderer.domElement.removeEventListener("mousedown", onMouseDown, true);
			this.viewer.renderer.domElement.removeEventListener("mousemove", insertionCallback, true);
			this.viewer.renderer.domElement.removeEventListener("mouseup", onMouseUp, true);
			// this.viewer.renderer.domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
			$('.clip_polygon').css({ "background-color": '' })
			document.body.style.cursor = 'default'
			this.viewer.inputHandler.enabled = true;
		}
	}

	startInsertion(args = {}) {
		let type = args.type || null;

		if (!type) return null;

		let domElement = this.viewer.renderer.domElement;
		let canvasSize = this.viewer.renderer.getSize();

		$(domElement.parentElement).find('svg.clippingStroke').remove();
		let svg = $(`
		<svg class="clippingStroke" height="${canvasSize.height}" width="${canvasSize.width}" style="position:absolute; pointer-events: none">

			<defs>
				 <marker id="diamond" markerWidth="24" markerHeight="24" refX="12" refY="12"
						markerUnits="userSpaceOnUse">
					<circle cx="12" cy="12" r="3" fill="red" stroke="#e74c3c" stroke-width="1.5"/>
				</marker>
			</defs>

			<polyline fill="none" stroke="black" 
				style="stroke:red;
				stroke-width:6;"
				stroke-dasharray="9, 6"
				stroke-dashoffset="2"
				/>

			<polyline fill="none" stroke="black" 
				style="stroke:red;
				stroke-width:2;"
				stroke-dasharray="5, 10"
				marker-start="url(#diamond)" 
				marker-mid="url(#diamond)" 
				marker-end="url(#diamond)" 
				/>
		</svg>`);

		$(domElement.parentElement).append(svg);

		let polyClipVol = new PolygonClipVolume(this.viewer.scene.getActiveCamera().clone());

		this.dispatchEvent({ type: "start_inserting_clipping_volume" });
		// clean
		this.viewer.scene.removeAllClipVolumes();
		$('.clip_polygon').css({ "background-color": 'red' })
		document.body.style.cursor = 'crosshair'

		this.viewer.scene.addPolygonClipVolume(polyClipVol);
		this.sceneMarker.add(polyClipVol);

		let cancel = {
			callback: null
		};

		let click = false
		let insertionCallback = (e) => {
			if (!click) return
			if (e.button === THREE.MOUSE.LEFT) {

				polyClipVol.addMarker();

				// SVC Screen Line
				svg.find("polyline").each((index, target) => {
					let newPoint = svg[0].createSVGPoint();
					newPoint.x = e.offsetX;
					newPoint.y = e.offsetY;
					let polyline = target.points.appendItem(newPoint);
				});


				if (polyClipVol.markers.length > this.maxPolygonVertices) {
					cancel.callback();
				}

				this.viewer.inputHandler.startDragging(polyClipVol.markers[polyClipVol.markers.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback(e);
			}
		};
		const onMouseDown = () => {
			click = true
			window._countTimeT1 = performance.now()
		}
		const onMouseUp = e => {
			console.debug('onMouseUp')
			click = false
			cancel.callback(e)
		}
		this.cancelReset = this.cancelResetFactory(onMouseUp, insertionCallback, onMouseDown, cancel)
		cancel.callback = e => {

			//let first = svg.find("polyline")[0].points[0];
			//svg.find("polyline").each((index, target) => {
			//	let newPoint = svg[0].createSVGPoint();
			//	newPoint.x = first.x;
			//	newPoint.y = first.y;
			//	let polyline = target.points.appendItem(newPoint);
			//});
			// svg.remove();

			if (polyClipVol.markers.length > 3) {
				polyClipVol.removeLastMarker();
				polyClipVol.initialized = true;
			} else {
				this.viewer.scene.removePolygonClipVolume(polyClipVol);
			}
			this.cancelReset()
			// @find manully trigger
			if(e.manulTrigger) {
				window._uSaved = true;
			}
		};

		this.viewer.addEventListener("cancel_insertions", cancel.callback);
		this.viewer.renderer.domElement.addEventListener("mousedown", onMouseDown, true);
		this.viewer.renderer.domElement.addEventListener("mousemove", insertionCallback, true);
		this.viewer.renderer.domElement.addEventListener("mouseup", onMouseUp, true);
		// this.viewer.renderer.domElement.addEventListener("mouseup", insertionCallback, true);
		this.viewer.inputHandler.enabled = false;

		window._strokeCamMat = {
			position: this.viewer.scene.view.position.clone(),
			yaw: this.viewer.scene.view.yaw, pitch: this.viewer.scene.view.pitch
		}
		// console.debug('position', this.viewer.scene.cameraP.position)
		// console.debug('rotation', this.viewer.scene.cameraP.rotation)

		polyClipVol.addMarker();
		this.viewer.inputHandler.startDragging(
			polyClipVol.markers[polyClipVol.markers.length - 1]);

		return polyClipVol;
	}

	update() {

	}
};