import styles from "./FindIdPage.module.css";


function FindIdPage() {


    return (

        <div className={styles.container}>


            <div className={styles.box}>


                <h1>
                    아이디 찾기
                </h1>



                <p>
                    회원가입 시 등록한 휴대폰 번호로
                    <br />
                    아이디를 확인합니다.
                </p>




                <input
                    type="text"
                    placeholder="휴대폰 번호 입력"
                />





                <button>
                    아이디 조회
                </button>




            </div>


        </div>

    );

}


export default FindIdPage;