import { useLayoutEffect, useMemo, useRef } from "react"
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import simulatiomnFragment from "./shaders/simulation/fragment.glsl"
import vertex from "./shaders/particles/vertex.glsl"

const WIDTH = 128
const BOUNDS = 512

const tempVector = new THREE.Vector3()

const getPoint = (v: THREE.Vector3, size: number): THREE.Vector3 => {
  v.x = Math.random() * 2 - 1
  v.y = Math.random() * 2 - 1
  v.z = Math.random() * 2 - 1
  if (v.length() > 1) return getPoint(v, size)
  return v.normalize().multiplyScalar(size)
}

const getSphere = (count: number, size: number) => {
  const len = count * 3
  const data = new Float32Array(len)
  const p = tempVector.clone()
  for (let i = 0; i < len; i += 4) {
    getPoint(p, size)
    data[i] = p.x
    data[i + 1] = p.y
    data[i + 2] = p.z
    data[i + 3] = 1
  }
  return data
}

const getRandomPoints = (count: number, size: number) => {
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

const material = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([
    THREE.ShaderLib["phong"].uniforms,
    { uTime: { value: 0.0 }, positionTexture: { value: null } },
  ]),
  vertexShader: vertex,
  fragmentShader: THREE.ShaderChunk["meshphong_frag"],
})

material.lights = true

material.color = new THREE.Color(0x0040c0)
material.specular = new THREE.Color(0x111111)
material.shininess = 50

// Sets the uniforms with the material values
material.uniforms["diffuse"].value = material.color
material.uniforms["specular"].value = material.specular
material.uniforms["shininess"].value = Math.max(material.shininess, 1e-4)
material.uniforms["opacity"].value = material.opacity

material.defines.WIDTH = WIDTH.toFixed(1)
material.defines.BOUNDS = BOUNDS.toFixed(1)

const Sketch = () => {
  const { gl } = useThree()

  //_ Create the fbo and simulation data
  const [gpuCompute, positionTexture] = useMemo(() => {
    const gpuRender = new GPUComputationRenderer(WIDTH, WIDTH, gl)
    const dataTexture = gpuRender.createTexture()

    // A data texture of random points - generates a cube shape
    const dataA = getRandomPoints(WIDTH * WIDTH * 4, 10)
    const dataTextureA = new THREE.DataTexture(
      dataA,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    dataTextureA.needsUpdate = true

    // A data texture of points arranged in a sphere shape
    const dataB = getSphere(WIDTH * WIDTH * 4, 10)
    const dataTextureB = new THREE.DataTexture(
      dataB,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    dataTextureB.needsUpdate = true

    // positionTexture is the data texture that will be updated each frame
    const positionTexture = gpuRender.addVariable(
      "positionTexture",
      simulatiomnFragment,
      dataTexture
    )

    positionTexture.material.uniforms.uTime = { value: 0.0 }
    positionTexture.material.uniforms.textureA = { value: dataTextureA }
    positionTexture.material.uniforms.textureB = { value: dataTextureB }
    positionTexture.wrapS = THREE.RepeatWrapping
    positionTexture.wrapT = THREE.RepeatWrapping

    gpuRender.init()

    return [gpuRender, positionTexture]
  }, [gl])

  // Buffer attributes for the presentational layer
  const [positions, pIndex] = useMemo(
    () => [
      Float32Array.from(new Array(WIDTH * WIDTH * 3).fill(0)),
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
    positionTexture.material.uniforms.uTime.value = clock.getElapsedTime()

    material.uniforms.positionTexture.value =
      gpuCompute.getCurrentRenderTarget(positionTexture).texture

    material.uniforms.uTime.value = clock.getElapsedTime()

    material.uniformsNeedUpdate = true
  })

  return (
    <instancedMesh
      args={[undefined, undefined, WIDTH * WIDTH]}
      castShadow
      receiveShadow
      material={material}
    >
      <boxGeometry args={[0.1, 0.5, 0.1]}>
        <instancedBufferAttribute
          attach='attributes-offset'
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <instancedBufferAttribute
          attach='attributes-pIndex'
          array={pIndex}
          count={pIndex.length / 2}
          itemSize={2}
        />
      </boxGeometry>
    </instancedMesh>
  )
}

export default Sketch
