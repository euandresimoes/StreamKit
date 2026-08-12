import { mount } from '@vue/test-utils'
import axe from 'axe-core'

import BaseButton from '../src/components/base/BaseButton.vue'
import BaseDropdown from '../src/components/base/BaseDropdown.vue'
import BaseInput from '../src/components/base/BaseInput.vue'
import BaseToggle from '../src/components/base/BaseToggle.vue'

describe('base components', () => {
  it('connects input labels, descriptions and invalid messages accessibly', async () => {
    const wrapper = mount(BaseInput, {
      attachTo: document.body,
      props: { error: 'Obrigatório', id: 'channel', label: 'Canal', modelValue: '' },
    })

    expect(wrapper.get('label').attributes('for')).toBe('channel')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('channel-message')
    await wrapper.get('input').setValue('StreamKit')
    expect(wrapper.emitted('update:modelValue')).toEqual([['StreamKit']])
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    })
    expect(result.violations).toEqual([])
    wrapper.unmount()
  })

  it('exposes toggle semantics and supports keyboard-driven change', async () => {
    const wrapper = mount(BaseToggle, { props: { label: 'Reduzir movimento', modelValue: false } })
    const input = wrapper.get('input')

    expect(input.attributes('role')).toBe('switch')
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  it('announces loading and disables repeat submission', () => {
    const wrapper = mount(BaseButton, { props: { loading: true }, slots: { default: 'Salvar' } })

    expect(wrapper.get('button').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('[role="status"]').text()).toContain('Processando')
  })

  it('closes a dropdown with Escape', async () => {
    const wrapper = mount(BaseDropdown, { props: { label: 'Ações' }, slots: { default: 'Item' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.find('.base-dropdown__menu').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.base-dropdown__menu').exists()).toBe(false)
  })
})
