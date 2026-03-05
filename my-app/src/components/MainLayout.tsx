import BottomNav from './BottomNav.tsx';

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <div className="pb-20 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
