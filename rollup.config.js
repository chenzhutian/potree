import replace from 'rollup-plugin-replace';
import commonjs from "rollup-plugin-commonjs";
import resolve from 'rollup-plugin-node-resolve';
import { relative, join } from 'path'
const buildFolder = require('./buildConfig').buildFolder

export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: join(buildFolder, 'potree.js'),
			format: 'umd',
			name: 'Potree',
			sourcemap: true,
		},
		plugins: [
			replace({ __buildFolder__: id => join(relative(id, __filename
			), buildFolder) }),
			resolve(),
			commonjs(),
		]
	}, {
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: join(buildFolder, 'workers/BinaryDecoderWorker.js'),
			format: 'es',
			name: 'Potree',
			sourcemap: false
		},
		plugins: [
			replace({ __buildFolder__: buildFolder }),
			resolve(),
			commonjs(),
		]
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