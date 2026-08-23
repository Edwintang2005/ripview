/**
 * Narrow types for the parts of the TfNSW `rapidJSON` responses that RipView
 * actually reads.
 *
 * Why these exist rather than the models in `typescript-fetch-client/api.ts`:
 * that client was produced by Swagger Codegen 2.4.43 and its models disagree
 * with the live API in ways that fail silently.
 *
 *  - `RouteProduct._class` — the generator renamed the `class` property to
 *    `_class` to avoid the reserved word, but the JSON key really is `class`.
 *    Reading `product._class` yields `undefined` for every leg, so any mode
 *    detection built on the generated model always falls through to its
 *    default. This is the single most consequential discrepancy.
 *  - `TripRequestResponseJourney` declares only `isAdditional`, `legs` and
 *    `rating`. Production also returns `fare`, `interchanges` and
 *    `daysOfService`.
 *  - `DepartureMonitorResponseStopEvent` declares only `departureTimePlanned`,
 *    `infos`, `location` and `transportation`. Production also returns
 *    `departureTimeEstimated`, `isRealtimeControlled` and `realtimeStatus` —
 *    that is, everything needed for a live departure board.
 *
 * Every field below was verified against a real production response. All are
 * optional: TfNSW omits rather than nulls, and occasionally returns an empty
 * string where a timestamp is expected.
 */

export interface RawProduct {
    /** Mode of transport. See `src/lib/modes.ts`. */
    class?: number;
    name?: string;
    iconId?: number;
}

export interface RawTransportation {
    id?: string;
    /** Full name, e.g. `Sydney Trains Network T1 North Shore & Western Line`. */
    name?: string;
    /** Name without the network prefix, e.g. `T1 North Shore & Western Line`. */
    disassembledName?: string;
    /** Short designator, e.g. `T1`, `M1`, `440`. */
    number?: string;
    description?: string;
    product?: RawProduct;
    destination?: { id?: string; name?: string };
}

export interface RawParent {
    id?: string;
    name?: string;
    disassembledName?: string;
    type?: string;
    parent?: RawParent;
}

export interface RawStop {
    id?: string;
    /** Full name including platform and suburb. */
    name?: string;
    /** Name without the suburb, e.g. `Central Station, Platform 18`. */
    disassembledName?: string;
    type?: string;
    parent?: RawParent;
    arrivalTimePlanned?: string;
    arrivalTimeEstimated?: string;
    departureTimePlanned?: string;
    departureTimeEstimated?: string;
}

export interface RawLegInfo {
    priority?: string;
    /** Short headline, e.g. `Lift out of service`. */
    subtitle?: string;
    content?: string;
    /** `lineInfo`, `stopInfo`, `routeInfo`, ... */
    type?: string;
}

export interface RawLeg {
    origin?: RawStop;
    destination?: RawStop;
    /** Ordered list of every stop the vehicle calls at, inclusive of both ends. */
    stopSequence?: RawStop[];
    transportation?: RawTransportation;
    /** Seconds. */
    duration?: number;
    /** Metres. */
    distance?: number;
    isRealtimeControlled?: boolean;
    infos?: RawLegInfo[];
}

export interface RawFareTicket {
    name?: string;
    /** `ADULT`, `CHILD`, ... */
    person?: string;
    /** Price in dollars. */
    priceBrutto?: number;
    currency?: string;
    properties?: {
        /**
         * Present only on the whole-journey summary ticket. Its value says how
         * much of the journey could be priced: `nswFareEnabled`,
         * `nswFarePartiallyEnabled`, `nswFareNotAvailable`,
         * `nswFareNotEnabled`.
         */
        evaluationTicket?: string;
    };
}

export interface RawJourney {
    legs?: RawLeg[];
    /** TfNSW's own interchange count. Recomputed from legs when absent. */
    interchanges?: number;
    fare?: { tickets?: RawFareTicket[] };
}

export interface RawTripResponse {
    journeys?: RawJourney[] | null;
    systemMessages?: { responseMessages?: { code?: string; text?: string }[] };
    /** Present on error responses. */
    ErrorDetails?: { Message?: string; ErrorCode?: string };
}

export interface RawStopEvent {
    location?: RawStop & { parent?: RawParent };
    transportation?: RawTransportation;
    departureTimePlanned?: string;
    departureTimeEstimated?: string;
    isRealtimeControlled?: boolean;
    /**
     * Live status flags. `MONITORED` means the service is being tracked;
     * `TRIP_CANCELLED` and `MONITORING_CANCELLED` indicate a cancellation.
     */
    realtimeStatus?: string[];
    infos?: RawLegInfo[];
}

export interface RawDepartureResponse {
    stopEvents?: RawStopEvent[] | null;
    locations?: RawStop[];
}

export interface RawStopFinderLocation {
    id?: string;
    name?: string;
    disassembledName?: string;
    type?: string;
    /** `product.class` values served at this location. */
    modes?: number[];
    matchQuality?: number;
    isBest?: boolean;
    parent?: RawParent;
}

export interface RawStopFinderResponse {
    locations?: RawStopFinderLocation[] | null;
}
