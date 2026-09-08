# co01102 Club

게임 태그 기반의 사진·파일 공유 SNS 커뮤니티입니다. Next.js, Supabase, Vercel을 기준으로 구성했습니다.

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Supabase 환경 변수가 없으면 홈 화면은 데모 데이터로 실행됩니다. 실제 가입, 글 작성, 좋아요, 댓글과 프로필 저장에는 Supabase 연결이 필요합니다.

## Supabase 설정

1. Supabase 프로젝트를 만들고 `supabase/migrations/202607230001_initial_schema.sql`을 적용합니다.
2. Authentication에서 Email provider를 내부 인증용으로 활성화하고 `Confirm email`은 끕니다.
3. 화면에서는 이메일을 받지 않습니다. 사용자는 아이디와 비밀번호만 입력하며 서버가 Supabase Auth용 가상 주소를 자동 생성합니다.
4. Site URL과 Redirect URLs에 로컬 및 Vercel 주소의 `/auth/callback`을 등록합니다.
5. `.env.local`에 Project URL과 anon key를 입력합니다. `SUPABASE_SERVICE_ROLE_KEY`는 향후 관리 작업용이며 현재 앱 런타임에서는 사용하지 않습니다.

Migration은 테이블, 인덱스, 프로필 자동 생성 trigger, RLS 정책, `post-images`/`post-files`/`avatars` 버킷과 대표 게임 데이터를 함께 생성합니다. 게시물에는 종류와 관계없이 최대 3개, 파일당 25MB까지 첨부할 수 있으며 공개 게시물에서 누구나 다운로드할 수 있습니다.

## Vercel 및 GitHub

1. 이 폴더를 GitHub 저장소의 `main` 브랜치에 push합니다.
2. Vercel에서 저장소를 Import하고 Framework Preset을 Next.js로 선택합니다.
3. Preview와 Production 환경에 `.env.example`의 변수를 등록합니다. `NEXT_PUBLIC_SITE_URL`은 각 배포 URL을 사용합니다.
4. Supabase Redirect URLs에 Vercel Production URL과 Preview URL 패턴을 추가합니다.

Pull Request마다 Vercel Preview가 생성되며 GitHub Actions가 타입, ESLint, Vitest, 프로덕션 빌드를 검사합니다.

## 개인정보 및 결제

- 가입에는 아이디와 비밀번호만 사용하며 실제 이메일, 전화번호, 실명, 주소를 받지 않습니다.
- Supabase Auth 호환을 위해 서버가 아이디에서 가상 주소를 만들지만 실제 이메일 주소가 아니며 화면이나 공개 프로필에 표시하지 않습니다.
- 비밀번호 원문은 앱 데이터베이스에 저장하지 않고 Supabase Auth가 안전하게 처리합니다.
- 결제, 카드, 광고, 방문자 분석 SDK를 사용하지 않습니다.
- 외부 Google Fonts도 사용하지 않으며, 게시물과 사진은 공개되므로 사용자가 개인정보를 직접 올리지 않도록 화면에서 안내합니다.

## 명령어

- `pnpm dev` — 개발 서버
- `pnpm typecheck` — TypeScript 검사
- `pnpm lint` — ESLint 검사
- `pnpm test` — 단위 테스트
- `pnpm build` — 프로덕션 빌드
