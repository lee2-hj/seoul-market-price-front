export {};

declare global {
  interface DaumPostcodeData {
    zonecode: string;
    address: string;
    roadAddress: string;
    jibunAddress: string;
    userSelectedType: "R" | "J";
    bname: string;
    buildingName: string;
    apartment: "Y" | "N";
  }

  interface DaumPostcodeOptions {
    oncomplete: (data: DaumPostcodeData) => void;
    onclose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void;
    width?: string | number;
    height?: string | number;
  }

  interface DaumPostcodeInstance {
    embed: (element: HTMLElement) => void;
    open: () => void;
  }

  interface Window {
    daum?: {
      Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance;
    };
  }
}
