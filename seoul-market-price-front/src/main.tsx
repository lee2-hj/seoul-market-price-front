import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './styles/tailwind.css'
import './styles/admin.css'
import App from './App.tsx'

// 전역 기본값을 지정하지 않으면 개별 useQuery가 staleTime을 빠뜨렸을 때
// 즉시 stale 처리되어(staleTime 기본값 0) 컴포넌트 마운트/창 포커스마다
// 불필요하게 재요청한다. 세션/유저 정보처럼 자주 바뀌지 않는 데이터를
// 다루는 페이지가 많으므로, 합리적인 기본값을 전역으로 깔아둔다.
// 각 쿼리는 필요에 따라 이 기본값을 개별적으로 덮어쓸 수 있다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)