

import { PointAttributeNames } from "./PointAttributes.js";
import { Version } from "../Version.js";
import { XHRFactory } from "../XHRFactory.js";


export class BinaryLoader {

	constructor(version, boundingBox, scale) {
		if (typeof (version) === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
		window._pointIdx = new Set()
		console.debug('will be deprecated in the future _pointIdx')
	}

	load(node) {
		if (node.loaded) {
			return;
		}

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.bin';
		}

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if ((xhr.status === 200 || xhr.status === 0) && xhr.response !== null) {
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					throw new Error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
				}
			}
		};

		try {
			xhr.send(null);
		} catch (e) {
			console.log('fehler beim laden der punktwolke: ' + e);
		}
	};

	parse(node, buffer) {
		let pointAttributes = node.pcoGeometry.pointAttributes;
		let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;

		if (this.version.upTo('1.5')) {
			node.numPoints = numPoints;
		}

		let workerPath = Potree.scriptPath + '/workers/BinaryDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function (e) {

			let data = e.data;
			let buffers = data.attributeBuffers;
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);
			// const { targetClass } = data
			// if(targetClass && !window._targetClass) {
			// 	window._targetClass =  targetClass
			// }

			Potree.workerPool.returnWorker(workerPath, worker);

			let geometry = new THREE.BufferGeometry();
			// already finish swapping
			for (let property in buffers) {
				let buffer = buffers[property].buffer;
				const propertyInt = parseInt(property)
				if(propertyInt === PointAttributeNames.PICKED) {
					geometry.addAttribute('picked', new THREE.BufferAttribute(new Uint8Array(buffer), 1))
				} else if (propertyInt === PointAttributeNames.LABEL) {
					window._label = new Uint8Array(buffer)
				} else if (propertyInt === PointAttributeNames.POINT_INDEX) {
					const idxBuffer = new Float32Array(buffer)
					geometry.addAttribute('pointIndex', new THREE.BufferAttribute(idxBuffer, 1))
					for(const idx of idxBuffer) {
						if(window._pointIdx.has(idx)) {
							console.error(`idx ${idx} repeated at ${node.name}`)
						}
						window._pointIdx.add(idx)
					}
				} else if (propertyInt === PointAttributeNames.POSITION_CARTESIAN) {
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (propertyInt === PointAttributeNames.COLOR_PACKED) {
					geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				} else if (propertyInt === PointAttributeNames.INTENSITY) {
					geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
				} else if (propertyInt === PointAttributeNames.CLASSIFICATION) {
					geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (propertyInt === PointAttributeNames.RETURN_NUMBER) {
					geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (propertyInt === PointAttributeNames.NUMBER_OF_RETURNS) {
					geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (propertyInt === PointAttributeNames.SOURCE_ID) {
					geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Uint16Array(buffer), 1));
				} else if (propertyInt === PointAttributeNames.NORMAL_SPHEREMAPPED) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (propertyInt === PointAttributeNames.NORMAL_OCT16) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (propertyInt === PointAttributeNames.NORMAL) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (propertyInt === PointAttributeNames.INDICES) {
					let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
					bufferAttribute.normalized = true;
					geometry.addAttribute('indices', bufferAttribute);
				} else if (propertyInt === PointAttributeNames.SPACING) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('spacing', bufferAttribute);
				} else if (propertyInt === PointAttributeNames.GPS_TIME) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('gpsTime', bufferAttribute);

					node.gpsTime = {
						offset: buffers[property].offset,
						range: buffers[property].range,
					};
				}
			}

			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			let numPoints = e.data.buffer.byteLength / pointAttributes.byteSize;

			node.numPoints = numPoints;
			node.geometry = geometry;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			node.estimatedSpacing = data.estimatedSpacing;
			Potree.numNodesLoading--;
			window._numToLoad--;
			// @find
			if(window._numToLoad === 0) {
				window.onLoadAllPC && window.onLoadAllPC()
			}
		};

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			version: this.version.version,
			min: [node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z],
			offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
			scale: this.scale,
			spacing: node.spacing,
			hasChildren: node.hasChildren,
			name: node.name,
			targetClass: window._targetClass,
			picked: window._picked,
		};
		worker.postMessage(message, [message.buffer]);
	};


}

