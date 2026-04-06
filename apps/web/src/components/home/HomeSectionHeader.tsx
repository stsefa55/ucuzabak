import Link from "next/link";

type HomeSectionHeaderProps = {
  title: string;
  href?: string;
  linkLabel?: string;
};

export function HomeSectionHeader({ title, href, linkLabel = "Tümünü gör" }: HomeSectionHeaderProps) {
  return (
    <div className="home-section__head">
      {href ? (
        <Link href={href} style={{ color: "inherit" }}>
          <h2 className="home-section__title">{title}</h2>
        </Link>
      ) : (
        <h2 className="home-section__title">{title}</h2>
      )}
      {href ? (
        <Link href={href} className="home-section__link">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
