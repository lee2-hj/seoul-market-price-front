import styles from "./KakaoLoginPage.module.css";

function KakaoLoginPage(){
    return (
        <div className={styles.page}>
            <div className={styles.box}>
                <h1> 오늘장 </h1>
                <h2> 카카오 로그인 </h2>
                <p>
                    카카오 계정으로<br/>오늘장 서비스를 시작합니다.
                </p>
                <button>카카오 로그인</button>
            </div>
        </div>
    );
}

export default KakaoLoginPage;