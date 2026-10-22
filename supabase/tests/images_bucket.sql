-- 이미지 버킷 설정 확인 (마이그레이션 20261023090000_images_bucket.sql 대상).
-- 실행: npx supabase db query --linked -f supabase/tests/images_bucket.sql
-- 결과의 matched 열이 모두 true 여야 한다.
-- 일반 사용자가 Storage API 로 직접 올리지 못하는 것은 정책이 하나도 없는 것으로 확인한다.

select 'images 버킷이 있고 공개다' as name,
       exists (select 1 from storage.buckets where id = 'images' and public) as matched
union all
select '한도는 8MB',
       exists (select 1 from storage.buckets where id = 'images' and file_size_limit = 8388608)
union all
select '허용 형식은 PNG, JPEG, WebP, GIF, SVG 다섯 가지',
       exists (
         select 1 from storage.buckets
         where id = 'images'
           and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
           and cardinality(allowed_mime_types) = 5
       )
union all
select 'images 버킷에 대한 일반 사용자용 올리기 정책이 없다 (정책 이름에 images 를 쓰는 insert 정책 0개)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'storage' and tablename = 'objects'
           and cmd in ('INSERT', 'ALL')
           and (qual ilike '%images%' or with_check ilike '%images%')
           and roles && array['anon', 'authenticated']::name[]
       );
