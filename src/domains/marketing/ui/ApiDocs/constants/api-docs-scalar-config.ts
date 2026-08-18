import type { AnyApiReferenceConfiguration } from '@scalar/api-reference-react'
import { OpenApiSecuritySchemeName } from '@/shared/openapi/constants/openapi-wire'
import {
  ApiDocsAssetPath,
  ApiDocsScalarColorMode,
  ApiDocsScalarDownload,
  ApiDocsScalarIntegration,
  ApiDocsScalarLayout,
  ApiDocsScalarTheme,
  ApiDocsScalarVisibility,
  ApiDocsSpecUrl,
} from '@/domains/marketing/ui/ApiDocs/constants/api-docs'

export const API_DOCS_SCALAR_CONFIGURATION = {
  _integration: ApiDocsScalarIntegration.NextJs,
  url: ApiDocsSpecUrl.OpenApi,
  theme: ApiDocsScalarTheme.None,
  layout: ApiDocsScalarLayout.Modern,
  showSidebar: true,
  hideModels: false,
  hideDownloadButton: false,
  documentDownloadType: ApiDocsScalarDownload.Json,
  hideClientButton: true,
  hiddenClients: true,
  showDeveloperTools: ApiDocsScalarVisibility.Never,
  forceDarkModeState: ApiDocsScalarColorMode.Dark,
  hideDarkModeToggle: true,
  withDefaultFonts: false,
  persistAuth: true,
  telemetry: false,
  favicon: ApiDocsAssetPath.Favicon,
  authentication: {
    preferredSecurityScheme: OpenApiSecuritySchemeName.BearerApiKey,
  },
} satisfies AnyApiReferenceConfiguration
