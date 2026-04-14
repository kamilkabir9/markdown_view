import AtJsonDocument, { InlineAnnotation } from '@atjson/document';

const Document = AtJsonDocument.default ?? AtJsonDocument;

/**
 * @typedef {object} InlineCommentAttributes
 * @property {string} text
 * @property {string} createdAt
 * @property {string} exact
 * @property {string} prefix
 * @property {string} suffix
 * @property {string[]=} headingPath
 * @property {number=} fallbackLine
 * @property {string=} sectionSlug
 * @property {string=} blockType
 * @property {boolean=} unresolved
 */

/**
 * @typedef {object} DocumentCommentAttributes
 * @property {string} text
 * @property {string} createdAt
 */

/**
 * @typedef {object} AtJsonCommentDocumentJSON
 * @property {string} content
 * @property {string} contentType
 * @property {Array<object>} annotations
 * @property {string[]} schema
 */

export class InlineComment extends InlineAnnotation {
  static vendorPrefix = 'markdown-viewer';
  static type = 'inline-comment';
}

export class DocumentComment extends InlineAnnotation {
  static vendorPrefix = 'markdown-viewer';
  static type = 'document-comment';
}

export class MarkdownCommentDocument extends Document {
  static contentType = 'application/vnd.markdown-viewer.comments+json';
  static schema = [InlineComment, DocumentComment];
}
