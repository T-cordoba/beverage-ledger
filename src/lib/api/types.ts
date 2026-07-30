import type { components, paths } from './schema';

type Schemas = components['schemas'];

export type Permission = Schemas['Permission'];
export type UserRole = Schemas['UserRole'];
export type CurrentSession = Schemas['CurrentSessionDto'];
export type SessionUser = Schemas['SessionUserDto'];
export type SessionOrganization = Schemas['SessionOrganizationDto'];

export type Category = Schemas['CategoryDto'];
export type Brand = Schemas['BrandDto'];
export type Product = Schemas['ProductDto'];
export type ProductFacets = Schemas['ProductFacetsDto'];

export type Movement = Schemas['MovementDto'];
export type MovementSummary = Schemas['MovementSummaryDto'];
export type MovementItem = Schemas['MovementItemDto'];
export type MovementType = Schemas['MovementType'];
export type MovementStatus = Schemas['MovementStatus'];
export type MovementUnit = Schemas['MovementUnit'];
export type MovementLineInput = Schemas['MovementLineInputDto'];
export type CreateMovementInput = Schemas['CreateMovementDto'];

export type ConsumptionReport = Schemas['ConsumptionReportDto'];
export type ConsumptionRow = Schemas['ConsumptionRowDto'];
export type SummaryReport = Schemas['SummaryReportDto'];

export type PageMeta = Schemas['PageMetaDto'];

/** Query shapes come from the operation, so a renamed param breaks the build. */
export type ProductListQuery = NonNullable<paths['/api/v1/products']['get']['parameters']['query']>;
export type MovementListQuery = NonNullable<
  paths['/api/v1/movements']['get']['parameters']['query']
>;
export type ConsumptionQuery = NonNullable<
  paths['/api/v1/reports/consumption']['get']['parameters']['query']
>;
export type ConsumptionGroupBy = NonNullable<ConsumptionQuery['groupBy']>;
