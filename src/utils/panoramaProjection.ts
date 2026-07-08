import * as THREE from "three";

// Note 1: 뷰포트의 마우스/포인터 클릭 좌표 및 Three.js 카메라 상태를 매칭하여
// 구형 3D 공간 상의 위도(atv/lat) 및 경도(ath/lon) 좌표계를 역산출해내는 좌표 투영 유틸리티입니다.
export const panoramaProjection = {
  /**
   * Note 2: PointerEvent 클릭 지점으로부터 구형 파노라마 공간 상의 ath (longitude) 및 atv (latitude) 정보를 연산해 냅니다.
   */
  calculateSphericalCoordinates(
    clientX: number,
    clientY: number,
    layerElement: HTMLDivElement,
    camera: THREE.Camera
  ): { lon: number; lat: number; localX: number; localY: number } {
    const rect = layerElement.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const w = rect.width;
    const hDim = rect.height;

    // Note 3: Three.js 레이캐스팅용 정규화 장치 좌표계(Normalized Device Coordinates, NDC)로 마우스 스크린 포지션을 매핑 변환합니다.
    const mouse = new THREE.Vector2(
      (localX / w) * 2 - 1,
      -(localY / hDim) * 2 + 1
    );

    // Note 4: 뷰포트 평면 상의 NDC 좌표와 카메라 위치를 기초로 투사선(Raycaster)을 발사해 3D 벡터 방향을 얻습니다.
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const dir = raycaster.ray.direction.clone().normalize();

    // Note 5: 3D 투사선 방향 벡터(dir)의 극좌표(Spherical coordinates) 각을 산출하여 구면 위/경도로 치환합니다.
    const phi = Math.acos(Math.max(-1, Math.min(1, dir.y)));
    const lat = 90 - (phi * 180) / Math.PI;

    const theta = Math.atan2(-dir.x, -dir.z);
    const lon = ((theta * 180) / Math.PI + 360) % 360;

    return {
      lon: Number(lon.toFixed(2)),
      lat: Number(lat.toFixed(2)),
      localX: Number(localX.toFixed(2)),
      localY: Number(localY.toFixed(2)),
    };
  }
};
