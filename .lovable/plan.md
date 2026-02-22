

# Supabase DB 연동 계획 (Read-Only)

## 개요
현재 mock 데이터 기반의 정적 대시보드를 Supabase DB에서 실시간 데이터를 조회하도록 전환합니다. Auth/권한 제어 및 CUD(Create/Update/Delete) 기능은 이번 작업에서 제외합니다.

---

## 작업 순서

### 1단계: Supabase 연결 설정
- Lovable Cloud를 활성화하여 Supabase 프로젝트 연결
- `@supabase/supabase-js` 패키지 설치
- `src/lib/supabase.ts` 생성 - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 환경변수로 `createClient` 초기화

### 2단계: DB 스키마 생성 (마이그레이션)
제공된 테이블 구조대로 7개 테이블을 생성합니다:

- `departments` - 부서 마스터
- `asset_types` - 자산유형 마스터
- `users` - 사용자 (Auth 유저가 아닌 업무용 사용자 정보)
- `tangible_assets` - IT 유형자산
- `intangible_assets` - IT 무형자산 (라이선스)
- `department_sales_summary` - 부서별 매출 요약
- `department_sales_breakdown` - 부서별 매출 구성 상세

모든 테이블에 RLS를 활성화하되, 현재 Auth 미구현 상태이므로 anon 사용자에게 SELECT 허용하는 임시 정책을 설정합니다. (추후 Auth 구현 시 교체 예정)

### 3단계: 초기 데이터 삽입
기존 mock 데이터를 기반으로 departments, asset_types, users, tangible_assets, intangible_assets, department_sales_summary, department_sales_breakdown 테이블에 샘플 데이터를 삽입합니다.

### 4단계: 타입 정의 업데이트
`src/data/mockData.ts`를 정리합니다:
- mock 배열 데이터 제거
- DB 테이블에 매핑되는 TypeScript 타입(인터페이스)을 `src/types/database.ts`로 이동
- `formatKRW` 같은 유틸 함수는 `src/lib/utils.ts`로 이동
- 기존 `UserRole`, `DEPARTMENTS` 등 상수는 유지하거나 적절히 이동

### 5단계: 서비스 레이어 생성
Supabase 호출 로직을 분리한 서비스 파일들을 생성합니다:

- **`src/services/departmentService.ts`** - 부서 목록 조회
- **`src/services/assetService.ts`** - 유형자산 목록 조회 (departments, asset_types JOIN)
- **`src/services/licenseService.ts`** - 무형자산 목록 조회 (departments JOIN)
- **`src/services/salesService.ts`** - 매출 요약/구성 조회 (departments JOIN)
- **`src/services/dashboardService.ts`** - 대시보드 요약 통계 (카운트, 최신 월 총매출 등)

각 서비스는 async 함수로 Supabase 쿼리를 실행하고 결과를 반환합니다.

### 6단계: React Query 훅 생성
`src/hooks/` 디렉토리에 각 서비스를 감싸는 커스텀 훅을 생성합니다:

- **`src/hooks/useTangibleAssets.ts`** - `useQuery`로 유형자산 조회
- **`src/hooks/useIntangibleAssets.ts`** - `useQuery`로 무형자산 조회
- **`src/hooks/useDepartments.ts`** - `useQuery`로 부서 목록 조회
- **`src/hooks/useSalesData.ts`** - `useQuery`로 매출 데이터 조회
- **`src/hooks/useDashboardStats.ts`** - `useQuery`로 대시보드 통계 조회

### 7단계: 페이지 컴포넌트 수정
각 페이지에서 mock 데이터 import를 제거하고 React Query 훅으로 교체합니다. 로딩/에러 상태를 처리하는 UI를 추가합니다.

- **`Dashboard.tsx`**: mock import 제거, `useDashboardStats` 훅 사용, 로딩 스켈레톤 추가
- **`ITTangibleAssets.tsx`**: mock import 제거, `useTangibleAssets` + `useDepartments` 훅 사용, 부서명은 departments 테이블에서 매핑
- **`ITIntangibleAssets.tsx`**: mock import 제거, `useIntangibleAssets` 훅 사용
- **`DepartmentBI.tsx`**: mock import 제거, `useSalesData` + `useDepartments` 훅 사용, month_key 선택 기능 추가

UI 디자인(다크 테마, 글라스 카드, 테이블 스타일 등)은 그대로 유지합니다.

### 8단계: AuthContext 임시 조정
- 현재 Auth 기능은 구현하지 않으므로, mock 로그인을 유지합니다
- `hasPermission` 등 권한 체크는 기존대로 동작하도록 유지

---

## 기술 상세

### Supabase 클라이언트 초기화 패턴
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 서비스 함수 패턴 예시
```typescript
// src/services/assetService.ts
export async function fetchTangibleAssets() {
  const { data, error } = await supabase
    .from('tangible_assets')
    .select(`*, departments(department_name), asset_types(sub_category)`)
    .order('purchase_date', { ascending: true });
  if (error) throw error;
  return data;
}
```

### React Query 훅 패턴 예시
```typescript
export function useTangibleAssets() {
  return useQuery({
    queryKey: ['tangible-assets'],
    queryFn: fetchTangibleAssets,
  });
}
```

### 로딩/에러 상태 처리
각 페이지에 Skeleton 컴포넌트를 활용한 로딩 상태와, 에러 발생 시 재시도 버튼이 있는 에러 메시지를 표시합니다.

---

## 변경되는 파일 목록

| 작업 | 파일 |
|------|------|
| 신규 | `src/lib/supabase.ts` |
| 신규 | `src/types/database.ts` |
| 신규 | `src/services/departmentService.ts` |
| 신규 | `src/services/assetService.ts` |
| 신규 | `src/services/licenseService.ts` |
| 신규 | `src/services/salesService.ts` |
| 신규 | `src/services/dashboardService.ts` |
| 신규 | `src/hooks/useTangibleAssets.ts` |
| 신규 | `src/hooks/useIntangibleAssets.ts` |
| 신규 | `src/hooks/useDepartments.ts` |
| 신규 | `src/hooks/useSalesData.ts` |
| 신규 | `src/hooks/useDashboardStats.ts` |
| 수정 | `src/data/mockData.ts` (유틸/상수만 남기거나 제거) |
| 수정 | `src/pages/Dashboard.tsx` |
| 수정 | `src/pages/ITTangibleAssets.tsx` |
| 수정 | `src/pages/ITIntangibleAssets.tsx` |
| 수정 | `src/pages/DepartmentBI.tsx` |
| 유지 | `src/contexts/AuthContext.tsx` (mock 로그인 유지) |
| DB 마이그레이션 | 7개 테이블 생성 + RLS 정책 |
| DB 데이터 삽입 | 초기 샘플 데이터 |

