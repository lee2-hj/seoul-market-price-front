export {};

declare global {
  interface Window {
    kakao?: KakaoGlobal;
  }

  interface KakaoGlobal {
    maps: KakaoMaps;
  }

  interface KakaoMaps {
    load(callback: () => void): void;
    LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
    Polygon: new (options: KakaoPolygonOptions) => KakaoPolygon;
    CustomOverlay: new (options: KakaoCustomOverlayOptions) => KakaoCustomOverlay;
    ZoomControl: new () => KakaoControl;
    ControlPosition: { RIGHT: unknown };
    event: {
      addListener(target: object, type: string, handler: () => void): void;
      removeListener(target: object, type: string, handler: () => void): void;
    };
  }

  type KakaoLatLng = object;
  type KakaoControl = object;

  interface KakaoLatLngBounds {
    extend(position: KakaoLatLng): void;
    contain(position: KakaoLatLng): boolean;
  }

  interface KakaoMapOptions {
    center: KakaoLatLng;
    level: number;
  }

  interface KakaoMap {
    addControl(control: KakaoControl, position: unknown): void;
    getCenter(): KakaoLatLng;
    panTo(position: KakaoLatLng): void;
    setBounds(bounds: KakaoLatLngBounds, padding?: number): void;
    setLevel(level: number): void;
    setMinLevel(level: number): void;
    setMaxLevel(level: number): void;
    relayout(): void;
  }

  interface KakaoPolygonOptions {
    map: KakaoMap;
    path: KakaoLatLng[] | KakaoLatLng[][];
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
  }

  interface KakaoPolygon {
    setMap(map: KakaoMap | null): void;
    setOptions(options: Partial<KakaoPolygonOptions>): void;
  }

  interface KakaoCustomOverlayOptions {
    map: KakaoMap;
    position: KakaoLatLng;
    content: HTMLElement;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }

  interface KakaoCustomOverlay {
    setMap(map: KakaoMap | null): void;
    setZIndex(zIndex: number): void;
  }
}
