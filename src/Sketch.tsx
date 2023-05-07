import { useMemo, useRef } from "react"
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { fragment } from "./shaders/fragment"

const WIDTH = 32

const particleVertex = `
    uniform float time;
    uniform sampler2D positionTexture;
 
    varying vec3 vPosition;
    varying vec2 vuv;


    attribute vec2 pIndex;

    void main() {
    

        vec3 pos = texture2D(positionTexture, pIndex).xyz;

        vuv = pIndex;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 30.0 * (1.0 / - mvPosition.z);

        gl_Position = projectionMatrix * mvPosition;
    }
`

const particleFragment = `
    varying vec2 vuv;

    void main() {
        gl_FragColor = vec4(vec3(vuv, 1.0), 1.0);
    }
`

const fillTexture = (texture: THREE.DataTexture) => {
  const dataArray = texture.image.data

  for (let k = 0, kl = dataArray.length; k < kl; k += 4) {
    const x = Math.random()
    const y = Math.random()
    const z = Math.random()

    dataArray[k + 0] = x
    dataArray[k + 1] = y
    dataArray[k + 2] = z
    dataArray[k + 3] = 1
  }

  return dataArray
}

function getPoint(v, size) {
  v.x = Math.random() * 2 - 1
  v.y = Math.random() * 2 - 1
  v.z = Math.random() * 2 - 1
  if (v.length() > 1) return getPoint(v, size)
  return v.normalize().multiplyScalar(size)
}

function getSphere(count, size) {
  const len = count * 3
  const data = new Float32Array(len)
  const p = new THREE.Vector3()
  for (let i = 0; i < len; i += 4) {
    getPoint(p, size)
    data[i] = p.x
    data[i + 1] = p.y
    data[i + 2] = p.z
    data[i + 3] = 1
  }
  return data
}

const getRandomPoints = (count, size) => {
  const len = count * 3
  const data = new Float32Array(len)

  for (let i = 0; i < len; i += 4) {
    data[i] = Math.random() * size - size / 2
    data[i + 1] = Math.random() * size - size / 2
    data[i + 2] = Math.random() * size - size / 2
    data[i + 3] = 1
  }
  return data
}

const Sketch = () => {
  const ref = useRef<THREE.ShaderMaterial>(null!)
  const { gl } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      positionTexture: { value: null },
    }),
    []
  )

  const [gpuCompute, positionTexture] = useMemo(() => {
    const gpuRender = new GPUComputationRenderer(WIDTH, WIDTH, gl)
    const dataTexture = gpuRender.createTexture()

    const dataA = getRandomPoints(WIDTH * WIDTH * 4, 1)
    const dataTextureA = new THREE.DataTexture(
      dataA,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    dataTextureA.needsUpdate = true

    const dataB = getSphere(WIDTH * WIDTH * 4, 1)

    const dataTextureB = new THREE.DataTexture(
      dataB,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    dataTextureB.needsUpdate = true

    const positionTexture = gpuRender.addVariable(
      "positionTexture",
      fragment,
      dataTexture
    )

    positionTexture.material.uniforms.time = { value: 0.0 }
    positionTexture.material.uniforms.textureA = { value: dataTextureA }
    positionTexture.material.uniforms.textureB = { value: dataTextureB }
    positionTexture.wrapS = THREE.RepeatWrapping
    positionTexture.wrapT = THREE.RepeatWrapping

    gpuRender.init()

    return [gpuRender, positionTexture]
  }, [gl])

  const [positions, pIndex] = useMemo(
    () => [
      Float32Array.from(
        new Array(WIDTH * WIDTH * 3).fill(0).map(() => Math.random())
      ),
      Float32Array.from(
        new Array(WIDTH * WIDTH)
          .fill(0)
          .flatMap((_, i) => [
            (i % WIDTH) / WIDTH,
            Math.floor(i / WIDTH) / WIDTH,
          ])
      ),
    ],
    []
  )

  useFrame(({ clock }) => {
    gpuCompute.compute()

    positionTexture.material.uniforms.time.value = clock.getElapsedTime()

    ref.current.uniforms.positionTexture.value =
      gpuCompute.getCurrentRenderTarget(positionTexture).texture

    ref.current.uniforms.uTime.value = clock.getElapsedTime()

    ref.current.uniformsNeedUpdate = true
  })

  return (
    <points>
      <bufferGeometry attach='geometry'>
        <bufferAttribute
          attach='attributes-position'
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach='attributes-pIndex'
          array={pIndex}
          count={pIndex.length / 2}
          itemSize={2}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
      />
    </points>
  )
}

export default Sketch
