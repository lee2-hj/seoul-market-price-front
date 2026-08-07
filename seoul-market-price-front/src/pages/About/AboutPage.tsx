import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="tw-scope mx-auto flex w-[min(1280px,calc(100%-32px))] flex-col gap-4 py-10 sm:w-[min(1280px,calc(100%-48px))] sm:gap-5 sm:py-12 lg:gap-6 lg:py-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-primary sm:text-sm">
          ABOUT
        </span>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          싸농 소개
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Header / Footer 공통 레이아웃과 라우팅 구조를 확인하기 위한 샘플
          페이지입니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">싸.농이란?</CardTitle>
          <CardDescription className="text-sm">
            서울시 농수산물 가격 정보를 한눈에 비교할 수 있는 서비스입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          품목별 시세 조회, 자치구별 가격 비교, 스마트 추천 기능을 통해 더
          저렴하게 장을 볼 수 있도록 돕습니다.
        </CardContent>
      </Card>
    </div>
  );
}
