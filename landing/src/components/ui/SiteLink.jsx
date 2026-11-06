import { Link } from 'react-router-dom';
import { isSiteRoute } from '../../app/siteNavigation.js';

export function SiteLink({ href, children, ...props }) {
  if (isSiteRoute(href) && props.download === undefined) {
    return <Link to={href} {...props}>{children}</Link>;
  }
  return <a href={href} {...props}>{children}</a>;
}
