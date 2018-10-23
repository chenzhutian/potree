const buildFolder = require('./gulpfile').buildFolder
import {join} from 'path'
export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: join(buildFolder, 'potree.js'),
			format: 'umd',
			name: 'Potree',
			sourcemap: true,
		}
	},{
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: join(buildFolder, 'workers/BinaryDecoderWorker.js'),
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}/*,{
		input: 'src/workers/LASDecoderWorker.js',
		output: {
			file: 'build/potree/workers/LASDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: true
		}
	},{
		input: 'src/workers/LASLAZWorker.js',
		output: {
			file: 'build/potree/workers/LASLAZWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: true
		}
	}*/
]