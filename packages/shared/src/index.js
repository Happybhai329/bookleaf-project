"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_ORDER = exports.STATUS_LABELS = exports.PRIORITY_LABELS = exports.CATEGORY_LABELS = exports.MessageVisibility = exports.TicketPriority = exports.TicketCategory = exports.TicketStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["AUTHOR"] = "AUTHOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["OPEN"] = "OPEN";
    TicketStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TicketStatus["RESOLVED"] = "RESOLVED";
    TicketStatus["CLOSED"] = "CLOSED";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var TicketCategory;
(function (TicketCategory) {
    TicketCategory["ROYALTY_PAYMENTS"] = "ROYALTY_PAYMENTS";
    TicketCategory["ISBN_METADATA"] = "ISBN_METADATA";
    TicketCategory["PRINTING_QUALITY"] = "PRINTING_QUALITY";
    TicketCategory["DISTRIBUTION_AVAILABILITY"] = "DISTRIBUTION_AVAILABILITY";
    TicketCategory["BOOK_STATUS_PRODUCTION"] = "BOOK_STATUS_PRODUCTION";
    TicketCategory["GENERAL_INQUIRY"] = "GENERAL_INQUIRY";
})(TicketCategory || (exports.TicketCategory = TicketCategory = {}));
var TicketPriority;
(function (TicketPriority) {
    TicketPriority["CRITICAL"] = "CRITICAL";
    TicketPriority["HIGH"] = "HIGH";
    TicketPriority["MEDIUM"] = "MEDIUM";
    TicketPriority["LOW"] = "LOW";
})(TicketPriority || (exports.TicketPriority = TicketPriority = {}));
var MessageVisibility;
(function (MessageVisibility) {
    MessageVisibility["PUBLIC"] = "PUBLIC";
    MessageVisibility["INTERNAL_NOTE"] = "INTERNAL_NOTE";
})(MessageVisibility || (exports.MessageVisibility = MessageVisibility = {}));
exports.CATEGORY_LABELS = {
    [TicketCategory.ROYALTY_PAYMENTS]: 'Royalty & Payments',
    [TicketCategory.ISBN_METADATA]: 'ISBN & Metadata Issues',
    [TicketCategory.PRINTING_QUALITY]: 'Printing & Quality',
    [TicketCategory.DISTRIBUTION_AVAILABILITY]: 'Distribution & Availability',
    [TicketCategory.BOOK_STATUS_PRODUCTION]: 'Book Status & Production Updates',
    [TicketCategory.GENERAL_INQUIRY]: 'General Inquiry',
};
exports.PRIORITY_LABELS = {
    [TicketPriority.CRITICAL]: 'Critical',
    [TicketPriority.HIGH]: 'High',
    [TicketPriority.MEDIUM]: 'Medium',
    [TicketPriority.LOW]: 'Low',
};
exports.STATUS_LABELS = {
    [TicketStatus.OPEN]: 'Open',
    [TicketStatus.IN_PROGRESS]: 'In Progress',
    [TicketStatus.RESOLVED]: 'Resolved',
    [TicketStatus.CLOSED]: 'Closed',
};
exports.PRIORITY_ORDER = {
    [TicketPriority.CRITICAL]: 0,
    [TicketPriority.HIGH]: 1,
    [TicketPriority.MEDIUM]: 2,
    [TicketPriority.LOW]: 3,
};
//# sourceMappingURL=index.js.map