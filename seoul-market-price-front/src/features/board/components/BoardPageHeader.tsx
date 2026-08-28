interface BoardPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function BoardPageHeader({
  eyebrow,
  title,
  description,
}: BoardPageHeaderProps) {
  return (
    <div className="text-center space-y-2 mb-8">
      <span className="inline-block px-3 py-1 bg-[#E6F4F2] text-[#0F766E] text-[11px] font-extrabold tracking-wider rounded-full uppercase">
        {eyebrow}
      </span>
      <h1 className="text-[36px] font-black text-[#123047] tracking-tight">
        {title}
      </h1>
      <p className="text-[15px] text-[#6B7280]">{description}</p>
    </div>
  );
}
