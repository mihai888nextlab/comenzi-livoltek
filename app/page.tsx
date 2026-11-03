import { SHELL } from '@/lib/shell';
import AppLoader from './AppLoader';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: SHELL }} />
      <AppLoader />
    </>
  );
}
