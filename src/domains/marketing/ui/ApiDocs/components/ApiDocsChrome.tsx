import Link from 'next/link'
import {
  ApiDocsAssetPath,
  ApiDocsChromeCopy,
  ApiDocsChromeHref,
  ApiDocsLogoSize,
  ApiDocsUiClass,
} from '@/domains/marketing/ui/ApiDocs/constants/api-docs'
import { LandingNavUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

export function ApiDocsChrome() {
  return (
    <header className={ApiDocsUiClass.Chrome}>
      <Link href={ApiDocsChromeHref.Home} prefetch={false} className={ApiDocsUiClass.ChromeBrand}>
        <img
          src={ApiDocsAssetPath.Logo}
          alt={LandingNavUiCopy.LogoAlt}
          className={ApiDocsUiClass.ChromeLogo}
          width={ApiDocsLogoSize.Width}
          height={ApiDocsLogoSize.Height}
        />
        <span className={ApiDocsUiClass.ChromeLabel}>{ApiDocsChromeCopy.Label}</span>
      </Link>
      <div className={ApiDocsUiClass.ChromeActions}>
        <Link href={ApiDocsChromeHref.Home} prefetch={false} className={ApiDocsUiClass.ChromeLink}>
          {ApiDocsChromeCopy.Home}
        </Link>
        <Link href={ApiDocsChromeHref.Login} prefetch={false} className={ApiDocsUiClass.ChromeCta}>
          {ApiDocsChromeCopy.GetStarted}
        </Link>
      </div>
    </header>
  )
}
