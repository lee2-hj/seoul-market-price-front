import { useState } from "react";

interface AddressSearchProps {
  onSelect: (address: string) => void;
}

function AddressSearch({ onSelect }: AddressSearchProps) {
  const [open, setOpen] = useState(false);

  const selectAddress = (address: string) => {
    onSelect(address);

    setOpen(false);
  };

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <button type="button" onClick={() => setOpen(true)}>
        주소검색
      </button>

      {open && (
        <div
          style={{
            position: "absolute",

            top: "55px",

            left: 0,

            width: "250px",

            padding: "15px",

            border: "1px solid #ddd",

            borderRadius: "10px",

            background: "#fff",

            zIndex: 100,

            boxShadow: "0 5px 15px rgba(0,0,0,.15)",
          }}
        >
          <p>주소 선택</p>

          <button
            type="button"
            onClick={() => selectAddress("서울특별시 강남구 테헤란로 123")}
          >
            서울특별시 강남구 테헤란로 123
          </button>

          <br />

          <br />

          <button
            type="button"
            onClick={() => selectAddress("서울특별시 마포구 월드컵북로 45")}
          >
            서울특별시 마포구 월드컵북로 45
          </button>

          <br />

          <br />

          <button type="button" onClick={() => setOpen(false)}>
            닫기
          </button>
        </div>
      )}
    </div>
  );
}

export default AddressSearch;
