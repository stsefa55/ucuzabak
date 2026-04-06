import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-page__head">
      <div>
        <h1 className="admin-page__title">{title}</h1>
        {description != null && description !== "" ? (
          <div className="admin-page__lede">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="admin-page__actions">{actions}</div> : null}
    </div>
  );
}
