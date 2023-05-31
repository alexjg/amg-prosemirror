import React, { useEffect, useRef, useState } from "react"

import { Command, EditorState, Transaction } from "prosemirror-state"
import { keymap } from "prosemirror-keymap"
import { baseKeymap, toggleMark } from "prosemirror-commands"
import { history, redo, undo } from "prosemirror-history"
import { schema } from "prosemirror-schema-basic"
import { MarkType } from "prosemirror-model"
import { EditorView } from "prosemirror-view"
import { DocHandle, DocHandlePatchPayload, } from "automerge-repo"
import "prosemirror-view/style/prosemirror.css"
import { default as automergePlugin } from "./plugin"
import { ChangeFn, reconcileProsemirror, reconcileAutomerge} from "./ampm"
import {Extend, Heads, Patch, Prop} from "@automerge/automerge"
import * as automerge from "@automerge/automerge"

export type EditorProps = {
  handle: DocHandle<any>
  path: Prop[]
}

const toggleBold = toggleMarkCommand(schema.marks.strong)
const toggleItalic = toggleMarkCommand(schema.marks.em)

function toggleMarkCommand(mark: MarkType): Command {
  return (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined
  ) => {
    return toggleMark(mark)(state, dispatch)
  }
}

export function Editor({ handle, path }: EditorProps) {
  const editorRoot = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    let editorConfig = {
      schema,
      history,
      plugins: [
        keymap({
          ...baseKeymap,
          "Mod-b": toggleBold,
          "Mod-i": toggleItalic,
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-Shift-z": redo,
        }),
        automergePlugin(handle.doc, path),
      ],
      doc: schema.node("doc", null, [
        schema.node("paragraph", null, [])
      ])
    }      

    function doChange(handle: DocHandle<any>): ((changeFn: ChangeFn) => Heads) {
      return ((changeFn: ChangeFn) => {
        handle.change(changeFn)
        return automerge.getHeads(handle.doc)
      })
    }
    let state = EditorState.create(editorConfig)
    const view = new EditorView(editorRoot.current, { 
      state,
      dispatchTransaction: (tx: Transaction) => {
        let newState = view.state.apply(tx)
        newState = reconcileAutomerge(newState, doChange(handle))
        view.updateState(newState)
      }
    })
    const onPatch = (p: DocHandlePatchPayload<any>) => {
      let headsAfter = automerge.getHeads(handle.doc)
      let newState = reconcileProsemirror(view.state, p.patches, headsAfter)
      view.updateState(newState)
    }
    handle.on("patch", onPatch)
    return () => {
      view.destroy()
      handle.off("patch", onPatch)
    }
  }, [handle, path])

  return <div ref={editorRoot}></div>

}
