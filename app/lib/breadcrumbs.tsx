import { Link } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';

function buildPathParts(sourcePath: string | null): string[] {
  return sourcePath?.split('/').filter(Boolean) ?? [];
}

export function buildMarkdownBreadcrumbs(sourcePath: string | null) {
  const parts = buildPathParts(sourcePath);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/" />}>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {parts.length > 0 ? (
            <BreadcrumbLink render={<Link to="/" />}>Markdown Files</BreadcrumbLink>
          ) : (
            <BreadcrumbPage>Markdown Files</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {parts.map((part, index) => (
          <span key={`${part}:${index}`} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{part}</BreadcrumbPage>
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
