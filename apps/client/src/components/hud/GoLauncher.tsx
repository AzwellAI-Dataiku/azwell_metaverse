import { useGoLauncherStore, GO_LINKS } from '../../stores/goLauncherStore.js';

export default function GoLauncher() {
  const isOpen = useGoLauncherStore((s) => s.isOpen);
  const close = useGoLauncherStore((s) => s.close);

  if (!isOpen) return null;

  const handleOpen = (url: string) => {
    window.open(url, '_blank');
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel-cy w-full max-w-md p-5"
      >
        <h2 className="text-lg font-bold text-cy-brown mb-4">바로가기</h2>
        <div className="grid grid-cols-5 gap-3">
          {GO_LINKS.map((link) => (
            <button
              key={link.key}
              onDoubleClick={() => handleOpen(link.url)}
              title={`더블클릭: ${link.label} 열기`}
              className="flex flex-col items-center gap-1 p-2 rounded-cy hover:bg-cy-cream
                         transition-colors select-none cursor-pointer"
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-[10px] text-cy-brown leading-tight text-center break-keep">
                {link.label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-cy-warm-gray mt-3 text-center">
          아이콘을 더블클릭하면 열립니다
        </p>
      </div>
    </div>
  );
}
