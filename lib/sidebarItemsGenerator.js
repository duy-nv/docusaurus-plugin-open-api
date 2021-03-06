"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultSidebarItemsGenerator = exports.CategoryMetadataFilenamePattern = exports.CategoryMetadataFilenameBase = void 0;
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const js_yaml_1 = tslib_1.__importDefault(require("js-yaml"));
const sidebars_1 = require("./sidebars");
const BreadcrumbSeparator = '/';
exports.CategoryMetadataFilenameBase = '_category_';
exports.CategoryMetadataFilenamePattern = '_category_.{json,yml,yaml}';
const CategoryMetadatasFileSchema = utils_validation_1.Joi.object({
    label: utils_validation_1.Joi.string(),
    position: utils_validation_1.Joi.number(),
    collapsed: utils_validation_1.Joi.boolean(),
});
// TODO I now believe we should read all the category metadata files ahead of time: we may need this metadata to customize docs metadata
// Example use-case being able to disable number prefix parsing at the folder level, or customize the default route path segment for an intermediate directory...
// TODO later if there is `CategoryFolder/index.md`, we may want to read the metadata as yaml on it
// see https://github.com/facebook/docusaurus/issues/3464#issuecomment-818670449
async function readCategoryMetadatasFile(categoryDirPath) {
    var _a, _b;
    function validateCategoryMetadataFile(content) {
        return utils_validation_1.Joi.attempt(content, CategoryMetadatasFileSchema);
    }
    async function tryReadFile(fileNameWithExtension, parse) {
        // Simpler to use only posix paths for mocking file metadatas in tests
        const filePath = utils_1.posixPath(path_1.default.join(categoryDirPath, fileNameWithExtension));
        if (await fs_extra_1.default.pathExists(filePath)) {
            const contentString = await fs_extra_1.default.readFile(filePath, { encoding: 'utf8' });
            const unsafeContent = parse(contentString);
            try {
                return validateCategoryMetadataFile(unsafeContent);
            }
            catch (e) {
                console.error(chalk_1.default.red(`The docs sidebar category metadata file looks invalid!\nPath=${filePath}`));
                throw e;
            }
        }
        return null;
    }
    return ((_b = (_a = (await tryReadFile(`${exports.CategoryMetadataFilenameBase}.json`, JSON.parse))) !== null && _a !== void 0 ? _a : (await tryReadFile(`${exports.CategoryMetadataFilenameBase}.yml`, js_yaml_1.default.load))) !== null && _b !== void 0 ? _b : 
    // eslint-disable-next-line no-return-await
    (await tryReadFile(`${exports.CategoryMetadataFilenameBase}.yaml`, js_yaml_1.default.load)));
}
// [...parents, tail]
function parseBreadcrumb(breadcrumb) {
    return {
        parents: lodash_1.take(breadcrumb, breadcrumb.length - 1),
        tail: lodash_1.last(breadcrumb),
    };
}
// Comment for this feature: https://github.com/facebook/docusaurus/issues/3464#issuecomment-818670449
const DefaultSidebarItemsGenerator = async function defaultSidebarItemsGenerator({ item, docs: allDocs, version, numberPrefixParser, }) {
    // Doc at the root of the autogenerated sidebar dir
    function isRootDoc(doc) {
        return doc.sourceDirName === item.dirName;
    }
    // Doc inside a subfolder of the autogenerated sidebar dir
    function isCategoryDoc(doc) {
        if (isRootDoc(doc)) {
            return false;
        }
        return (
        // autogen dir is . and doc is in subfolder
        item.dirName === '.' ||
            // autogen dir is not . and doc is in subfolder
            // "api/myDoc" startsWith "api/" (note "api2/myDoc" is not included)
            doc.sourceDirName.startsWith(utils_1.addTrailingSlash(item.dirName)));
    }
    function isInAutogeneratedDir(doc) {
        return isRootDoc(doc) || isCategoryDoc(doc);
    }
    // autogenDir=a/b and docDir=a/b/c/d => returns c/d
    // autogenDir=a/b and docDir=a/b => returns .
    function getDocDirRelativeToAutogenDir(doc) {
        if (!isInAutogeneratedDir(doc)) {
            throw new Error('getDocDirRelativeToAutogenDir() can only be called for  subdocs of the sidebar autogen dir');
        }
        // Is there a node API to compare 2 relative paths more easily?
        // path.relative() does not give good results
        if (item.dirName === '.') {
            return doc.sourceDirName;
        }
        else if (item.dirName === doc.sourceDirName) {
            return '.';
        }
        else {
            return doc.sourceDirName.replace(utils_1.addTrailingSlash(item.dirName), '');
        }
    }
    // Get only docs in the autogen dir
    // Sort by folder+filename at once
    const docs = lodash_1.sortBy(allDocs.filter(isInAutogeneratedDir), (d) => d.source);
    if (docs.length === 0) {
        console.warn(chalk_1.default.yellow(`No docs found in dir ${item.dirName}: can't auto-generate a sidebar`));
    }
    function createDocSidebarItem(doc) {
        return {
            type: 'doc',
            id: doc.id,
            ...(doc.frontMatter.sidebar_label && {
                label: doc.frontMatter.sidebar_label,
            }),
            ...(typeof doc.sidebarPosition !== 'undefined' && {
                position: doc.sidebarPosition,
            }),
        };
    }
    async function createCategorySidebarItem({ breadcrumb, }) {
        var _a, _b, _c;
        const categoryDirPath = path_1.default.join(version.contentPath, item.dirName, // fix https://github.com/facebook/docusaurus/issues/4638
        breadcrumb.join(BreadcrumbSeparator));
        const categoryMetadatas = await readCategoryMetadatasFile(categoryDirPath);
        const { tail } = parseBreadcrumb(breadcrumb);
        const { filename, numberPrefix } = numberPrefixParser(tail);
        const position = (_a = categoryMetadatas === null || categoryMetadatas === void 0 ? void 0 : categoryMetadatas.position) !== null && _a !== void 0 ? _a : numberPrefix;
        return {
            type: 'category',
            label: (_b = categoryMetadatas === null || categoryMetadatas === void 0 ? void 0 : categoryMetadatas.label) !== null && _b !== void 0 ? _b : filename,
            items: [],
            collapsed: (_c = categoryMetadatas === null || categoryMetadatas === void 0 ? void 0 : categoryMetadatas.collapsed) !== null && _c !== void 0 ? _c : sidebars_1.DefaultCategoryCollapsedValue,
            ...(typeof position !== 'undefined' && { position }),
        };
    }
    // Not sure how to simplify this algorithm :/
    async function autogenerateSidebarItems() {
        const sidebarItems = []; // mutable result
        const categoriesByBreadcrumb = {}; // mutable cache of categories already created
        async function getOrCreateCategoriesForBreadcrumb(breadcrumb) {
            if (breadcrumb.length === 0) {
                return null;
            }
            const { parents } = parseBreadcrumb(breadcrumb);
            const parentCategory = await getOrCreateCategoriesForBreadcrumb(parents);
            const existingCategory = categoriesByBreadcrumb[breadcrumb.join(BreadcrumbSeparator)];
            if (existingCategory) {
                return existingCategory;
            }
            else {
                const newCategory = await createCategorySidebarItem({
                    breadcrumb,
                });
                if (parentCategory) {
                    parentCategory.items.push(newCategory);
                }
                else {
                    sidebarItems.push(newCategory);
                }
                categoriesByBreadcrumb[breadcrumb.join(BreadcrumbSeparator)] = newCategory;
                return newCategory;
            }
        }
        // Get the category breadcrumb of a doc (relative to the dir of the autogenerated sidebar item)
        function getRelativeBreadcrumb(doc) {
            const relativeDirPath = getDocDirRelativeToAutogenDir(doc);
            if (relativeDirPath === '.') {
                return [];
            }
            else {
                return relativeDirPath.split(BreadcrumbSeparator);
            }
        }
        async function handleDocItem(doc) {
            const breadcrumb = getRelativeBreadcrumb(doc);
            const category = await getOrCreateCategoriesForBreadcrumb(breadcrumb);
            const docSidebarItem = createDocSidebarItem(doc);
            if (category) {
                category.items.push(docSidebarItem);
            }
            else {
                sidebarItems.push(docSidebarItem);
            }
        }
        // async process made sequential on purpose! order matters
        for (const doc of docs) {
            // eslint-disable-next-line no-await-in-loop
            await handleDocItem(doc);
        }
        return sidebarItems;
    }
    const sidebarItems = await autogenerateSidebarItems();
    return sortSidebarItems(sidebarItems);
};
exports.DefaultSidebarItemsGenerator = DefaultSidebarItemsGenerator;
// Recursively sort the categories/docs + remove the "position" attribute from final output
// Note: the "position" is only used to sort "inside" a sidebar slice
// It is not used to sort across multiple consecutive sidebar slices (ie a whole Category composed of multiple autogenerated items)
function sortSidebarItems(sidebarItems) {
    const processedSidebarItems = sidebarItems.map((item) => {
        if (item.type === 'category') {
            return {
                ...item,
                items: sortSidebarItems(item.items),
            };
        }
        return item;
    });
    const sortedSidebarItems = lodash_1.orderBy(processedSidebarItems, (item) => item.position, ['asc']);
    return sortedSidebarItems.map(({ position: _removed, ...item }) => item);
}
