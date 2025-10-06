import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import { pageResources, renderPage } from "../../components/renderPage"
import { pathToRoot, FullSlug } from "../../util/path"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"
import { QuartzPluginData } from "../vfile"
import { Node } from "unist"
import LandingPage from "../../components/pages/LandingPage"
import { FullPageLayout } from "../../cfg"
import { sharedPageComponents } from "../../../quartz.layout"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"

async function processLandingPage(
  ctx: BuildCtx,
  tree: Node,
  fileData: QuartzPluginData,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  const slug = "index" as FullSlug
  const cfg = ctx.cfg.configuration
  const externalResources = pageResources(pathToRoot(slug), resources)
  const componentData: QuartzComponentProps = {
    ctx,
    fileData,
    externalResources,
    cfg,
    children: [],
    tree,
    allFiles,
  }

  const content = renderPage(cfg, slug, componentData, opts, externalResources)
  return write({
    ctx,
    content,
    slug,
    ext: ".html",
  })
}

export const LandingPageEmitter: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    pageBody: LandingPage(),
    beforeBody: [],
    left: [],
    right: [],
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "LandingPageEmitter",
    getQuartzComponents() {
      return [Head, Header, Body, ...header, ...beforeBody, pageBody, ...afterBody, ...left, ...right, Footer]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)

      // Find the index.md file
      for (const [tree, file] of content) {
        const slug = file.data.slug!
        if (slug === "index") {
          yield processLandingPage(ctx, tree, file.data, allFiles, opts, resources)
          break
        }
      }
    },
    async *partialEmit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)

      // If index.md changed or any episode changed, regenerate landing page
      for (const [, file] of content) {
        const slug = file.data.slug!
        if (slug === "index" || slug.startsWith("episodes/")) {
          // Find index file
          const indexContent = content.find(([_, f]) => f.data.slug === "index")
          if (indexContent) {
            yield processLandingPage(ctx, indexContent[0], indexContent[1].data, allFiles, opts, resources)
            break
          }
        }
      }
    },
  }
}
