import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    useSearchParams,
} from "react-router-dom";

import styles from "./MyPage.module.css";

/**
 * 마이페이지 상단에서 선택할 수 있는 탭 종류이다.
 */
type MyPageTab =
    | "PROFILE"
    | "NOTIFICATION"
    | "ACTIVITY";

/**
 * 내 활동 탭에서 선택할 수 있는 목록 종류이다.
 */
type ActivityType =
    | "POST"
    | "COMMENT";

/**
 * 회원 가입 방식이다.
 *
 * 실제 백엔드 API가 연결되면 회원 정보 응답의
 * 가입 방식 값으로 결정한다.
 */
type LoginType =
    | "LOCAL"
    | "SOCIAL";

/**
 * URL Query Parameter의 tab 값이
 * 마이페이지에서 지원하는 탭인지 확인한다.
 */
function isMyPageTab(
    value: string | null,
): value is MyPageTab {
    return (
        value === "PROFILE" ||
        value === "NOTIFICATION" ||
        value === "ACTIVITY"
    );
}

/**
 * 관심 품목에 표시할 기본 Mock 데이터이다.
 *
 * 실제 백엔드 연결 전까지 화면 확인용으로 사용한다.
 */
const INITIAL_FAVORITE_ITEMS = [
    "사과",
    "배추",
    "쌀",
];

/**
 * 마이페이지의 화면 확인용 설정을 저장할 localStorage Key이다.
 *
 * 실제 백엔드 API가 연결되면 이 localStorage 저장 구조는
 * 회원 설정 조회/수정 API 요청으로 교체한다.
 */
const MY_PAGE_STORAGE_KEY =
    "myPageSettings";

/**
 * 내 정보의 입력값 타입이다.
 */
type Profile = {
    /**
     * 일반 로그인 또는 소셜 로그인 가입 방식이다.
     */
    loginType: LoginType;

    /**
     * 회원 이름이다.
     */
    name: string;

    /**
     * 일반 로그인 회원의 아이디이다.
     *
     * 소셜 로그인 회원은 빈 문자열일 수 있다.
     */
    userId: string;

    /**
     * 휴대폰 번호이다.
     */
    phone: string;

    /**
     * 이메일 주소이다.
     */
    email: string;

    /**
     * 기본 주소이다.
     */
    address: string;

    /**
     * 상세 주소이다.
     */
    detailAddress: string;
};

/**
 * 알림 설정의 입력값 타입이다.
 */
type NotificationSettings = {
    /**
     * 전체 가격 변동 알림 수신 여부
     */
    priceChange: boolean;

    /**
     * 가격 상승 알림 수신 여부
     */
    priceIncrease: boolean;

    /**
     * 가격 하락 알림 수신 여부
     */
    priceDecrease: boolean;

    /**
     * 관심 품목만 알림 받을지 여부
     */
    favoriteOnly: boolean;
};

/**
 * 가격 변동 알림의 조건 종류이다.
 */
type PriceAlertCondition =
    | "PRICE_BELOW"
    | "PRICE_ABOVE"
    | "RATE_UP"
    | "RATE_DOWN";

/**
 * 품목별 가격 변동 알림 한 건이다.
 */
type PriceAlert = {
    /**
     * 화면 목록에서 사용할 고유번호이다.
     */
    id: number;

    /**
     * 알림을 받을 품목명이다.
     */
    itemName: string;

    /**
     * 목표 가격 또는 등락률 조건이다.
     */
    condition: PriceAlertCondition;

    /**
     * 목표 가격(원) 또는 등락률(%) 값이다.
     */
    threshold: number;

    /**
     * 해당 알림의 수신 여부이다.
     */
    enabled: boolean;
};

/**
 * 현재 localStorage에 저장할 마이페이지 설정 타입이다.
 */
type MyPageSettings = {
    profile: Profile;
    favoriteItems: string[];
    preferredDistrict: string;
    notificationSettings: NotificationSettings;
    priceAlerts: PriceAlert[];
};
/**
 * 이전 화면 버전의 localStorage 데이터 타입이다.
 *
 * 기존 우리 동네 탭에서 사용하던 selectedDistrict 값을
 * 새 선호 지역 값으로 옮기기 위해 잠시 유지한다.
 */
type LegacyMyPageSettings =
    Partial<MyPageSettings> & {
        selectedDistrict?: string;
    };

/**
 * 처음 마이페이지에 들어왔을 때 사용할 기본 회원 정보이다.
 *
 * 현재는 일반 로그인 회원 화면을 기본값으로 사용한다.
 * 소셜 로그인 회원은 loginType이 SOCIAL인 상태로
 * 백엔드에서 전달받아 표시할 예정이다.
 */
const DEFAULT_PROFILE: Profile = {
    loginType: "LOCAL",
    name: "홍길동",
    userId: "hong123",
    phone: "010-1234-5678",
    email: "hong@example.com",
    address: "서울특별시 마포구",
    detailAddress: "싸농아파트 101동 1001호",
};

/**
 * 처음 마이페이지에 들어왔을 때 사용할 기본 알림 설정이다.
 */
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    priceChange: true,
    priceIncrease: true,
    priceDecrease: true,
    favoriteOnly: true,
};

/**
 * 조건별 가격 변동 알림의 화면 표시 문구이다.
 */
const PRICE_ALERT_CONDITION_LABELS:
    Record<PriceAlertCondition, string> = {
    PRICE_BELOW: "원 이하",
    PRICE_ABOVE: "원 이상",
    RATE_UP: "% 이상 상승",
    RATE_DOWN: "% 이상 하락",
};

/**
 * 화면 확인용 기본 가격 변동 알림이다.
 *
 * 실제 API 연결 후에는 회원별 가격 알림 조회 결과로 교체한다.
 */
const DEFAULT_PRICE_ALERTS: PriceAlert[] = [
    {
        id: 1,
        itemName: "쌀",
        condition: "PRICE_BELOW",
        threshold: 4700,
        enabled: true,
    },
    {
        id: 2,
        itemName: "배추",
        condition: "RATE_DOWN",
        threshold: 10,
        enabled: true,
    },
];

/**
 * 우리 동네와 선호 지역 선택에 사용할 서울시 자치구 목록이다.
 */
const SEOUL_DISTRICTS = [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
];

/**
 * 브라우저 localStorage에 저장된 마이페이지 설정을 읽어온다.
 *
 * 저장된 값이 없거나 형식이 잘못되었으면 null을 반환하여
 * 기본 Mock 데이터를 사용하게 한다.
 */
function getStoredMyPageSettings():
    | LegacyMyPageSettings
    | null {
    const savedSettings =
        localStorage.getItem(
            MY_PAGE_STORAGE_KEY,
        );

    if (!savedSettings) {
        return null;
    }

    try {
        return JSON.parse(
            savedSettings,
        ) as LegacyMyPageSettings;
    } catch (error) {
        console.error(
            "마이페이지 설정 데이터 파싱 오류",
            error,
        );

        localStorage.removeItem(
            MY_PAGE_STORAGE_KEY,
        );

        return null;
    }
}

/**
 * 회원가입 주소에서 서울시 자치구를 찾아
 * 우리 동네로 표시한다.
 *
 * 주소에 자치구 이름이 없으면 안내 문구를 반환한다.
 */
function getDistrictFromAddress(
    address: string,
): string {
    const foundDistrict =
        SEOUL_DISTRICTS.find(
            (district) =>
                address.includes(district),
        );

    return (
        foundDistrict ??
        "주소를 입력하면 자동 설정됩니다."
    );
}

/**
 * 내 활동의 작성 게시글 목록이다.
 *
 * 실제 API 연결 전 화면 확인을 위한 Mock 데이터이다.
 */
const MOCK_MY_POSTS = [
    {
        id: 13,
        title: "가격 예측 기능 의견",
        createdAt: "2026.07.30",
        viewCount: 17,
    },
    {
        id: 11,
        title: "가격 데이터 기준 문의",
        createdAt: "2026.07.29",
        viewCount: 23,
    },
    {
        id: 9,
        title: "검색 결과 정렬 문의",
        createdAt: "2026.07.28",
        viewCount: 10,
    },
];

/**
 * 내 활동의 작성 댓글 목록이다.
 *
 * 댓글 API가 만들어지면 실제 댓글 목록 조회 API로 교체한다.
 */
const MOCK_MY_COMMENTS = [
    {
        id: 3,
        postId: 15,
        content:
            "좋은 정보 감사합니다. 다음 업데이트도 기대할게요.",
        postTitle:
            "농수산물 가격정보 서비스 오픈 안내",
        createdAt: "2026.08.04",
    },
    {
        id: 2,
        postId: 14,
        content:
            "우리 동네 가격 비교 기능을 자주 사용하고 있습니다.",
        postTitle:
            "자치구별 가격 비교 이용 안내",
        createdAt: "2026.08.03",
    },
    {
        id: 1,
        postId: 13,
        content:
            "가격 기준일이 궁금했는데 도움이 되었습니다.",
        postTitle:
            "가격정보 조회 기준 안내",
        createdAt: "2026.08.01",
    },
];

/**
 * 마이페이지 화면이다.
 *
 * 현재는 화면 확인용 Mock 상태만 사용한다.
 * 실제 API가 준비되면 각 설정 데이터를
 * 백엔드 API로 조회하고 저장하도록 교체한다.
 */
function MyPage() {
    /**
     * 현재 URL의 Query Parameter를 관리한다.
     *
     * 예:
     * /mypage?tab=NOTIFICATION
     */
    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    /**
     * URL에 저장된 탭 값을 읽는다.
     *
     * tab 값이 없거나 잘못된 값이면
     * 기본 화면인 내 정보 탭을 사용한다.
     */
    const tabValue =
        searchParams.get("tab");

    const activeTab: MyPageTab =
        isMyPageTab(tabValue)
            ? tabValue
            : "PROFILE";

    /**
     * 선택한 탭을 URL Query Parameter에 저장한다.
     *
     * 새로고침과 브라우저 뒤로가기·앞으로가기에도
     * 현재 선택한 탭이 유지된다.
     */
    const handleTabChange = (
        nextTab: MyPageTab,
    ) => {
        const nextSearchParams =
            new URLSearchParams(
                searchParams,
            );

        if (nextTab === "PROFILE") {
            nextSearchParams.delete("tab");
        } else {
            nextSearchParams.set(
                "tab",
                nextTab,
            );
        }

        setSearchParams(nextSearchParams);
    };

    /**
     * 내 활동 탭 내부에서 선택한 목록 상태이다.
     */
    const [activityType, setActivityType] =
        useState<ActivityType>("POST");

    /**
     * 내 정보 화면에서 표시할 입력값이다.
     */
    const [profile, setProfile] =
        useState<Profile>(() => {
            const savedSettings =
                getStoredMyPageSettings();

            if (!savedSettings?.profile) {
                return DEFAULT_PROFILE;
            }

            /*
             * 기존 localStorage 데이터에는 loginType이 없을 수 있어
             * 기본값 LOCAL을 함께 적용한다.
             */
            return {
                ...DEFAULT_PROFILE,
                ...savedSettings.profile,
            };
        });

    /**
     * 현재 사용자가 관심 등록한 품목 목록이다.
     */
    const [favoriteItems, setFavoriteItems] =
        useState<string[]>(() => {
            const savedSettings =
                getStoredMyPageSettings();

            return (
                savedSettings?.favoriteItems ??
                INITIAL_FAVORITE_ITEMS
            );
        });

    /**
     * 관심 품목 추가 입력창의 값이다.
     */
    const [newFavoriteItem, setNewFavoriteItem] =
        useState("");

    /**
     * 사용자가 직접 선택하는 선호 지역이다.
     *
     * 기존 selectedDistrict 값이 있다면
     * 이전 설정을 유지하여 선호 지역으로 사용한다.
     */
    const [
        preferredDistrict,
        setPreferredDistrict,
    ] = useState(() => {
        const savedSettings =
            getStoredMyPageSettings();

        return (
            savedSettings?.preferredDistrict ??
            savedSettings?.selectedDistrict ??
            "마포구"
        );
    });

    /**
     * 가격 변동 알림 설정 상태이다.
     */
    const [
        notificationSettings,
        setNotificationSettings,
    ] = useState<NotificationSettings>(() => {
        const savedSettings =
            getStoredMyPageSettings();

        return (
            savedSettings?.notificationSettings ??
            DEFAULT_NOTIFICATION_SETTINGS
        );
    });

    /**
 * 사용자가 등록한 품목별 가격 변동 알림 목록이다.
 */
    const [priceAlerts, setPriceAlerts] =
        useState<PriceAlert[]>(() => {
            const savedSettings =
                getStoredMyPageSettings();

            return (
                savedSettings?.priceAlerts ??
                DEFAULT_PRICE_ALERTS
            );
        });

    /**
     * 새 가격 변동 알림에 입력할 품목명이다.
     */
    const [
        newPriceAlertItemName,
        setNewPriceAlertItemName,
    ] = useState("");

    /**
     * 새 가격 변동 알림의 조건이다.
     */
    const [
        newPriceAlertCondition,
        setNewPriceAlertCondition,
    ] = useState<PriceAlertCondition>(
        "PRICE_BELOW",
    );

    /**
     * 새 가격 변동 알림의 가격 또는 등락률 값이다.
     *
     * input에서는 문자열로 관리하고,
     * 등록할 때 숫자로 변환한다.
     */
    const [
        newPriceAlertThreshold,
        setNewPriceAlertThreshold,
    ] = useState("");

    /**
     * 회원가입 주소를 기준으로 계산한 우리 동네이다.
     *
     * 사용자가 직접 선택하는 선호 지역과는 다르다.
     */
    const homeDistrict =
        getDistrictFromAddress(
            profile.address,
        );

    /**
     * 현재 회원이 소셜 로그인 회원인지 확인한다.
     */
    const isSocialUser =
        profile.loginType === "SOCIAL";

    /**
     * 마이페이지 설정값이 변경될 때마다
     * 브라우저 localStorage에 자동 저장한다.
     */

    /**
* 마이페이지 설정값이 변경될 때마다
* 브라우저 localStorage에 자동 저장한다.
*/
    useEffect(() => {
        const settingsToSave: MyPageSettings = {
            profile,
            favoriteItems,
            preferredDistrict,
            notificationSettings,
            priceAlerts,
        };

        localStorage.setItem(
            MY_PAGE_STORAGE_KEY,
            JSON.stringify(settingsToSave),
        );
    }, [
        profile,
        favoriteItems,
        preferredDistrict,
        notificationSettings,
        priceAlerts,
    ]);

    /**
     * 내 정보 입력값을 변경한다.
     */
    const handleProfileChange = (
        field:
            | "name"
            | "phone"
            | "email"
            | "address"
            | "detailAddress",
        value: string,
    ) => {
        setProfile((previousProfile) => ({
            ...previousProfile,
            [field]: value,
        }));
    };
    /**
 * 내 정보 저장 버튼 처리.
 *
 * 현재는 화면 확인 단계이므로 localStorage 자동 저장만 사용한다.
 * 백엔드 연동 시에는 이 위치에서 회원정보 수정 API를 호출한다.
 */
    const handleProfileSave = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        alert("내 정보가 저장되었습니다.");
    };

    /**
     * 관심 품목을 추가한다.
     */
    const handleFavoriteAdd = () => {
        const trimmedItem =
            newFavoriteItem.trim();

        if (!trimmedItem) {
            alert("관심 품목을 입력해 주세요.");
            return;
        }

        if (
            favoriteItems.includes(
                trimmedItem,
            )
        ) {
            alert(
                "이미 등록된 관심 품목입니다.",
            );
            return;
        }

        setFavoriteItems((previousItems) => [
            ...previousItems,
            trimmedItem,
        ]);

        setNewFavoriteItem("");
    };

    /**
     * 관심 품목을 삭제한다.
     */
    const handleFavoriteRemove = (
        targetItem: string,
    ) => {
        setFavoriteItems((previousItems) =>
            previousItems.filter(
                (item) => item !== targetItem,
            ),
        );
    };

    /**
 * 새 가격 변동 알림을 추가한다.
 *
 * 현재는 화면 확인 단계이므로 품목명을 직접 입력한다.
 * 나중에 백엔드 품목 검색 API가 연결되면
 * 검색 결과에서 품목을 선택하는 방식으로 교체할 수 있다.
 */
    const handlePriceAlertAdd = () => {
        const itemName =
            newPriceAlertItemName.trim();

        const threshold =
            Number(newPriceAlertThreshold);

        if (!itemName) {
            alert("알림을 받을 품목명을 입력해 주세요.");
            return;
        }

        if (
            !Number.isFinite(threshold) ||
            threshold <= 0
        ) {
            alert(
                "가격 또는 등락률은 0보다 큰 숫자로 입력해 주세요.",
            );
            return;
        }

        const isDuplicate = priceAlerts.some(
            (priceAlert) =>
                priceAlert.itemName === itemName &&
                priceAlert.condition ===
                newPriceAlertCondition &&
                priceAlert.threshold === threshold,
        );

        if (isDuplicate) {
            alert("이미 등록된 가격 변동 알림입니다.");
            return;
        }

        const nextId =
            priceAlerts.length === 0
                ? 1
                : Math.max(
                    ...priceAlerts.map(
                        (priceAlert) =>
                            priceAlert.id,
                    ),
                ) + 1;

        setPriceAlerts((previousAlerts) => [
            ...previousAlerts,
            {
                id: nextId,
                itemName,
                condition:
                    newPriceAlertCondition,
                threshold,
                enabled: true,
            },
        ]);

        setNewPriceAlertItemName("");
        setNewPriceAlertCondition(
            "PRICE_BELOW",
        );
        setNewPriceAlertThreshold("");
    };

    /**
     * 가격 변동 알림 한 건의 수신 여부를 변경한다.
     */
    const handlePriceAlertEnabledChange = (
        priceAlertId: number,
    ) => {
        setPriceAlerts((previousAlerts) =>
            previousAlerts.map((priceAlert) =>
                priceAlert.id === priceAlertId
                    ? {
                        ...priceAlert,
                        enabled:
                            !priceAlert.enabled,
                    }
                    : priceAlert,
            ),
        );
    };

    /**
     * 가격 변동 알림 한 건을 삭제한다.
     */
    const handlePriceAlertRemove = (
        priceAlertId: number,
    ) => {
        setPriceAlerts((previousAlerts) =>
            previousAlerts.filter(
                (priceAlert) =>
                    priceAlert.id !== priceAlertId,
            ),
        );
    };

    /**
     * 알림 설정 체크 상태를 변경한다.
     */
    const handleNotificationChange = (
        key: keyof NotificationSettings,
    ) => {
        setNotificationSettings(
            (previousSettings) => ({
                ...previousSettings,
                [key]: !previousSettings[key],
            }),
        );
    };

    /**
     * 알림 설정 저장 버튼 처리.
     *
     * 실제 백엔드 연동 시에는 알림 설정 저장 API를 호출한다.
     */
    const handleNotificationSave = () => {
        alert("알림 설정이 저장되었습니다.");
    };

    /**
     * 회원 탈퇴 버튼 처리.
     *
     * 현재는 화면 확인만 하므로 실제 탈퇴를 진행하지 않는다.
     */
    const handleWithdrawal = () => {
        const confirmed = window.confirm(
            "정말 회원 탈퇴를 진행하시겠습니까?\n현재는 화면 확인 단계이므로 실제 탈퇴되지 않습니다.",
        );

        if (confirmed) {
            alert(
                "회원 탈퇴 API가 연결되면 이 위치에서 탈퇴 처리가 진행됩니다.",
            );
        }
    };

    return (
        <main className={styles.myPage}>
            <header className={styles.pageHeader}>
                <span className={styles.eyebrow}>
                    MY PAGE
                </span>

                <h1>마이페이지</h1>

                <p>
                    내 정보와 서비스 설정을 관리할 수 있습니다.
                </p>
            </header>

            {/* 마이페이지의 최상단 탭 */}
            <nav
                className={styles.tabList}
                aria-label="마이페이지 메뉴"
            >
                <button
                    type="button"
                    className={
                        activeTab === "PROFILE"
                            ? styles.activeTab
                            : styles.tabButton
                    }
                    onClick={() =>
                        handleTabChange("PROFILE")
                    }
                >
                    내 정보
                </button>

                <button
                    type="button"
                    className={
                        activeTab === "NOTIFICATION"
                            ? styles.activeTab
                            : styles.tabButton
                    }
                    onClick={() =>
                        handleTabChange("NOTIFICATION")
                    }
                >
                    알림 설정
                </button>

                <button
                    type="button"
                    className={
                        activeTab === "ACTIVITY"
                            ? styles.activeTab
                            : styles.tabButton
                    }
                    onClick={() =>
                        handleTabChange("ACTIVITY")
                    }
                >
                    내 활동
                </button>
            </nav>

            <section className={styles.contentCard}>
                {/* =====================================================
                    내 정보 탭
                ===================================================== */}
                {activeTab === "PROFILE" && (
                    <form
                        className={styles.form}
                        onSubmit={handleProfileSave}
                    >
                        <div className={styles.sectionHeading}>
                            <div>
                                <h2>내 정보</h2>

                                <p>
                                    회원가입 시 입력한 정보와
                                    관심 품목, 지역 설정을
                                    관리할 수 있습니다.
                                </p>
                            </div>
                        </div>

                        {/* =================================================
                            관심 품목
                        ================================================= */}
                        <section
                            className={
                                styles.profileSection
                            }
                        >
                            <div className={styles.sectionHeading}>
                                <h3>관심 품목</h3>

                                <p>
                                    자주 확인하는 품목을 등록하면
                                    가격 조회와 알림 설정에 활용할 수
                                    있습니다.
                                </p>
                            </div>

                            {/*
                                form 안에 또 form을 넣으면 HTML 구조가
                                잘못되므로 div로 구성한다.
                            */}
                            <div className={styles.favoriteForm}>
                                <input
                                    value={newFavoriteItem}
                                    onChange={(event) =>
                                        setNewFavoriteItem(
                                            event.target.value,
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter"
                                        ) {
                                            event.preventDefault();

                                            handleFavoriteAdd();
                                        }
                                    }}
                                    placeholder="예: 사과, 배추, 고등어"
                                />

                                <button
                                    type="button"
                                    className={
                                        styles.primaryButton
                                    }
                                    onClick={handleFavoriteAdd}
                                >
                                    추가
                                </button>
                            </div>

                            <div className={styles.tagList}>
                                {favoriteItems.map((item) => (
                                    <span
                                        key={item}
                                        className={
                                            styles.favoriteTag
                                        }
                                    >
                                        {item}

                                        <button
                                            type="button"
                                            aria-label={`${item} 관심 품목 삭제`}
                                            onClick={() =>
                                                handleFavoriteRemove(
                                                    item,
                                                )
                                            }
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </section>

                        {/* =================================================
    가격 변동 알림
================================================= */}
                        <section className={styles.priceAlertSection}>
                            <div className={styles.priceAlertHeading}>
                                <h3>가격 변동 알림</h3>

                                <p>
                                    원하는 가격 또는 등락률 조건을 등록하면
                                    해당 품목의 가격 변동을 알려드립니다.
                                </p>
                            </div>

                            {/*
        현재는 품목을 직접 입력하는 화면 단계이다.
        추후 품목 검색 API와 자동완성 기능으로 교체할 수 있다.
    */}
                            <div className={styles.priceAlertForm}>
                                <input
                                    value={newPriceAlertItemName}
                                    onChange={(event) =>
                                        setNewPriceAlertItemName(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="품목명"
                                />

                                <select
                                    value={newPriceAlertCondition}
                                    onChange={(event) =>
                                        setNewPriceAlertCondition(
                                            event.target
                                                .value as PriceAlertCondition,
                                        )
                                    }
                                >
                                    <option value="PRICE_BELOW">
                                        가격 이하
                                    </option>

                                    <option value="PRICE_ABOVE">
                                        가격 이상
                                    </option>

                                    <option value="RATE_UP">
                                        가격 상승률
                                    </option>

                                    <option value="RATE_DOWN">
                                        가격 하락률
                                    </option>
                                </select>

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={newPriceAlertThreshold}
                                    onChange={(event) =>
                                        setNewPriceAlertThreshold(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="가격 또는 비율"
                                />

                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={handlePriceAlertAdd}
                                >
                                    알림 추가
                                </button>
                            </div>

                            <div className={styles.priceAlertList}>
                                {priceAlerts.length === 0 ? (
                                    <p className={styles.emptyPriceAlert}>
                                        등록된 가격 변동 알림이 없습니다.
                                    </p>
                                ) : (
                                    priceAlerts.map((priceAlert) => (
                                        <div
                                            key={priceAlert.id}
                                            className={styles.priceAlertItem}
                                        >
                                            <div>
                                                <strong>
                                                    {priceAlert.itemName}
                                                </strong>

                                                <span>
                                                    {priceAlert.threshold.toLocaleString()}
                                                    {
                                                        PRICE_ALERT_CONDITION_LABELS[
                                                        priceAlert.condition
                                                        ]
                                                    }
                                                </span>
                                            </div>

                                            <div
                                                className={
                                                    styles.priceAlertActions
                                                }
                                            >
                                                <label
                                                    className={
                                                        styles.priceAlertToggle
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            priceAlert.enabled
                                                        }
                                                        onChange={() =>
                                                            handlePriceAlertEnabledChange(
                                                                priceAlert.id,
                                                            )
                                                        }
                                                    />

                                                    <span>
                                                        {priceAlert.enabled
                                                            ? "ON"
                                                            : "OFF"}
                                                    </span>
                                                </label>

                                                <button
                                                    type="button"
                                                    className={
                                                        styles.priceAlertRemoveButton
                                                    }
                                                    onClick={() =>
                                                        handlePriceAlertRemove(
                                                            priceAlert.id,
                                                        )
                                                    }
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>이름</span>

                                <input
                                    value={profile.name}
                                    onChange={(event) =>
                                        handleProfileChange(
                                            "name",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="이름을 입력해 주세요."
                                />
                            </label>

                            {/* 소셜 로그인 사용자는 아이디를 표시하지 않는다. */}
                            {!isSocialUser && (
                                <label
                                    className={styles.field}
                                >
                                    <span>아이디</span>

                                    <input
                                        value={
                                            profile.userId
                                        }
                                        readOnly
                                    />

                                    <small>
                                        아이디는 변경할 수
                                        없습니다.
                                    </small>
                                </label>
                            )}

                            <label className={styles.field}>
                                <span>휴대폰 번호</span>

                                <input
                                    value={profile.phone}
                                    onChange={(event) =>
                                        handleProfileChange(
                                            "phone",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="휴대폰 번호를 입력해 주세요."
                                />
                            </label>

                            <label className={styles.field}>
                                <span>이메일</span>

                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(event) =>
                                        handleProfileChange(
                                            "email",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="이메일을 입력해 주세요."
                                />
                            </label>

                            <label
                                className={`${styles.field} ${styles.fullWidth}`}
                            >
                                <span>주소</span>

                                <input
                                    value={profile.address}
                                    onChange={(event) =>
                                        handleProfileChange(
                                            "address",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="주소를 입력해 주세요."
                                />
                            </label>

                            <label
                                className={`${styles.field} ${styles.fullWidth}`}
                            >
                                <span>상세 주소</span>

                                <input
                                    value={
                                        profile.detailAddress
                                    }
                                    onChange={(event) =>
                                        handleProfileChange(
                                            "detailAddress",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="상세 주소를 입력해 주세요."
                                />
                            </label>
                        </div>

                        {/* 이어서 3/3에서 지역, 관심 품목, 알림, 내 활동을 붙인다. */}
                        {/* =================================================
                            내 지역 설정
                        ================================================= */}
                        <section
                            className={
                                styles.profileSection
                            }
                        >
                            <div className={styles.sectionHeading}>
                                <h3>내 지역 설정</h3>

                                <p>
                                    우리 동네는 가입 시 입력한
                                    주소를 기준으로 자동 설정됩니다.
                                </p>
                            </div>

                            <div className={styles.formGrid}>
                                <label className={styles.field}>
                                    <span>우리 동네</span>

                                    <input
                                        value={homeDistrict}
                                        readOnly
                                    />

                                    <small>
                                        주소를 변경하면 우리 동네도
                                        함께 변경됩니다.
                                    </small>
                                </label>

                                <label className={styles.field}>
                                    <span>선호 지역</span>

                                    <select
                                        value={
                                            preferredDistrict
                                        }
                                        onChange={(event) =>
                                            setPreferredDistrict(
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            선호 지역 선택
                                        </option>

                                        {SEOUL_DISTRICTS.map(
                                            (district) => (
                                                <option
                                                    key={district}
                                                    value={district}
                                                >
                                                    {district}
                                                </option>
                                            ),
                                        )}
                                    </select>

                                    <small>
                                        가격 비교와 추천에 사용할
                                        지역입니다.
                                    </small>
                                </label>
                            </div>
                        </section>



                        <div className={styles.buttonRow}>
                            {/*
                                일반 회원만 비밀번호 변경 기능을
                                사용한다. 소셜 로그인에는 비밀번호가 없다.
                            */}
                            {!isSocialUser && (
                                <button
                                    type="button"
                                    className={
                                        styles.secondaryButton
                                    }
                                    onClick={() =>
                                        alert(
                                            "비밀번호 변경 API 연결 후 사용할 수 있습니다.",
                                        )
                                    }
                                >
                                    비밀번호 변경
                                </button>
                            )}

                            <button
                                type="submit"
                                className={
                                    styles.primaryButton
                                }
                            >
                                내 정보 저장
                            </button>
                        </div>

                        {/* =================================================
                            회원 탈퇴
                        ================================================= */}
                        <section className={styles.dangerZone}>
                            <div>
                                <h3>회원 탈퇴</h3>

                                <p>
                                    탈퇴하면 계정과 관련된 서비스
                                    이용이 제한될 수 있습니다.
                                </p>
                            </div>

                            <button
                                type="button"
                                className={
                                    styles.withdrawalButton
                                }
                                onClick={handleWithdrawal}
                            >
                                회원 탈퇴
                            </button>
                        </section>
                    </form>
                )}

                {/* =====================================================
                    알림 설정 탭
                ===================================================== */}
                {activeTab === "NOTIFICATION" && (
                    <>
                        <div className={styles.sectionHeading}>
                            <div>
                                <h2>알림 설정</h2>

                                <p>
                                    관심 품목의 가격 변동 알림을
                                    설정할 수 있습니다.
                                </p>
                            </div>
                        </div>

                        <div className={styles.settingList}>
                            <label className={styles.settingItem}>
                                <div>
                                    <strong>
                                        가격 변동 알림 받기
                                    </strong>

                                    <span>
                                        관심 품목의 가격 변동을
                                        알려드립니다.
                                    </span>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        notificationSettings.priceChange
                                    }
                                    onChange={() =>
                                        handleNotificationChange(
                                            "priceChange",
                                        )
                                    }
                                />
                            </label>

                            <label className={styles.settingItem}>
                                <div>
                                    <strong>
                                        가격 상승 알림
                                    </strong>

                                    <span>
                                        가격이 상승했을 때
                                        알려드립니다.
                                    </span>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        notificationSettings.priceIncrease
                                    }
                                    disabled={
                                        !notificationSettings.priceChange
                                    }
                                    onChange={() =>
                                        handleNotificationChange(
                                            "priceIncrease",
                                        )
                                    }
                                />
                            </label>

                            <label className={styles.settingItem}>
                                <div>
                                    <strong>
                                        가격 하락 알림
                                    </strong>

                                    <span>
                                        가격이 하락했을 때
                                        알려드립니다.
                                    </span>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        notificationSettings.priceDecrease
                                    }
                                    disabled={
                                        !notificationSettings.priceChange
                                    }
                                    onChange={() =>
                                        handleNotificationChange(
                                            "priceDecrease",
                                        )
                                    }
                                />
                            </label>

                            <label className={styles.settingItem}>
                                <div>
                                    <strong>
                                        관심 품목만 알림 받기
                                    </strong>

                                    <span>
                                        등록한 관심 품목에 대해서만
                                        알림을 받습니다.
                                    </span>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        notificationSettings.favoriteOnly
                                    }
                                    disabled={
                                        !notificationSettings.priceChange
                                    }
                                    onChange={() =>
                                        handleNotificationChange(
                                            "favoriteOnly",
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className={styles.buttonRow}>
                            <button
                                type="button"
                                className={
                                    styles.primaryButton
                                }
                                onClick={
                                    handleNotificationSave
                                }
                            >
                                알림 설정 저장
                            </button>
                        </div>
                    </>
                )}

                {/* =====================================================
                    내 활동 탭
                ===================================================== */}
                {activeTab === "ACTIVITY" && (
                    <>
                        <div className={styles.sectionHeading}>
                            <div>
                                <h2>내 활동</h2>

                                <p>
                                    내가 작성한 게시글과 댓글을
                                    확인할 수 있습니다.
                                </p>
                            </div>
                        </div>

                        <div
                            className={
                                styles.activityTabList
                            }
                        >
                            <button
                                type="button"
                                className={
                                    activityType === "POST"
                                        ? styles.activeActivityTab
                                        : styles.activityTabButton
                                }
                                onClick={() =>
                                    setActivityType("POST")
                                }
                            >
                                작성한 게시글
                            </button>

                            <button
                                type="button"
                                className={
                                    activityType === "COMMENT"
                                        ? styles.activeActivityTab
                                        : styles.activityTabButton
                                }
                                onClick={() =>
                                    setActivityType("COMMENT")
                                }
                            >
                                작성한 댓글
                            </button>
                        </div>

                        <div className={styles.settingList}>
                            {activityType === "POST" &&
                                MOCK_MY_POSTS.map((post) => (
                                    <button
                                        key={post.id}
                                        type="button"
                                        className={
                                            styles.activitySettingItem
                                        }
                                        onClick={() => {
                                            window.location.href =
                                                `/board/${post.id}`;
                                        }}
                                    >
                                        <div>
                                            <strong>
                                                {post.title}
                                            </strong>

                                            <span>
                                                작성일{" "}
                                                {post.createdAt}
                                                {" · "}조회수{" "}
                                                {post.viewCount}
                                            </span>
                                        </div>

                                        <b aria-hidden="true">
                                            ›
                                        </b>
                                    </button>
                                ))}

                            {activityType === "COMMENT" &&
                                MOCK_MY_COMMENTS.map(
                                    (comment) => (
                                        <button
                                            key={comment.id}
                                            type="button"
                                            className={
                                                styles.activitySettingItem
                                            }
                                            onClick={() => {
                                                window.location.href =
                                                    `/board/${comment.postId}`;
                                            }}
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        comment.postTitle
                                                    }
                                                </strong>

                                                <span>
                                                    {comment.content}
                                                    {" · "}작성일{" "}
                                                    {
                                                        comment.createdAt
                                                    }
                                                </span>
                                            </div>

                                            <b aria-hidden="true">
                                                ›
                                            </b>
                                        </button>
                                    ),
                                )}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

export default MyPage;