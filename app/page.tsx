import CutoutTitle from "./components/CutoutTitle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center min-h-screen bg-[url('/cover.png')] bg-cover bg-center bg-no-repeat bg-fixed">
      <header className="w-full px-4 pt-10 sm:pt-14">
        <CutoutTitle text="My Mixtape Collection" />
      </header>
    </div>
  );
}
